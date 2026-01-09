// chess-move-logic.js - Move Processing & AI Logic
// Handles: player moves, AI moves, move quality, hints, game endings

// Extend ChessGameState with move logic
Object.assign(ChessTheoryApp.prototype, {
  
  // ========================================
  // CHESS API QUERIES
  // ========================================
  
  async queryExplorer() {
    const fen = this.game.fen();
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const countEl = document.getElementById('gameCount');
      if (countEl) {
        countEl.textContent = totalGames === 0 
          ? 'Position data unavailable — continuing...' 
          : `Position reached ${totalGames.toLocaleString()} times`;
      }
    } catch (e) {
      console.error('Explorer query failed:', e);
    }
  },

  // ========================================
  // PLAYER MOVE HANDLING
  // ========================================
  
  async handleClick(row, col) {
    if (this.game.turn() !== this.playerColor || this.game.game_over()) return;
    const square = 'abcdefgh'[col] + (8 - row);

    if (this.selected) {
      const moveOptions = { from: this.selected, to: square, promotion: 'q' };
      const preMoveFEN = this.game.fen();
      let move = this.game.move(moveOptions);
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        
        if (!this.practiceMode) {
          this.playerMoves++;
        }
        
        this.playMoveSound(move);
        
        if (!this.practiceMode) {
          const moveUCI = move.from + move.to + (move.promotion || '');
          await this.checkMoveQuality(preMoveFEN, moveUCI);
        }
        
        this.selected = null;
        document.getElementById('theoryMessage').style.display = 'none';
        this.ui.renderBoard();
        
        if (this.practiceMode && !this.game.game_over()) {
          console.log("⚔️ Practice mode move: Triggering Maia response...");
          setTimeout(() => this.maiaMove(), 600);
        } else {
          setTimeout(() => this.render(), 100);
        }
        return;
      }
      this.selected = null;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.playerColor) {
      this.selected = square;
    }
    this.ui.renderBoard();
  },

  // ========================================
  // MOVE QUALITY CHECKING
  // ========================================
  
  async checkMoveQuality(prevFEN, playerUCI) {
    try {
      this.qualityTrackedMoves++;
      
      // Auto-pass opening book moves
      if (this.playerMoves <= SKIP_QUALITY_MOVES) {
        this.topMoveChoices++;
        console.log(`⭐️ Opening book move ${this.playerMoves} - auto-counted as top 3 (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }
      
      const data = await ChessAPI.queryExplorer(this.aiSource, prevFEN);
      
      if (!data.moves || data.moves.length === 0) {
        console.log(`⚠️ No explorer data available for quality check (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }
      
      // Find move in explorer data
      const moveIndex = data.moves.findIndex(m => 
        m.uci === playerUCI || m.san === (
          playerUCI === 'e1g1' || playerUCI === 'e8g8' ? 'O-O' : 
          playerUCI === 'e1c1' || playerUCI === 'e8c8' ? 'O-O-O' : ''
        )
      );
      
      if (moveIndex === -1) {
        console.log(`❌ Move not found in explorer data (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }
      
      // Top 3 moves auto-qualify
      if (moveIndex < 3) {
        this.topMoveChoices++;
        console.log(`✅ Top 3 move! Rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }
      
      // Check for "tricky moves" (ranks 5-20 with win advantage)
      await this.checkTrickyMove(moveIndex, data.moves[moveIndex]);
      
    } catch (e) {
      console.error('Quality check error:', e);
    }
  },

  async checkTrickyMove(moveIndex, move) {
    const trickyConfig = this.aiSource === 'master' ? MASTER_TRICKY_MOVE : CLUB_TRICKY_MOVE;
    
    if (!trickyConfig.enabled || moveIndex < (trickyConfig.minRank - 1) || moveIndex > (trickyConfig.maxRank - 1)) {
      console.log(`❌ Not top 3, rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
      return;
    }
    
    const totalGames = move.white + move.draws + move.black;
    
    // Calculate win percentages
    let playerWinPct, opponentWinPct;
    if (this.playerColor === 'w') {
      playerWinPct = (move.white / totalGames) * 100;
      opponentWinPct = (move.black / totalGames) * 100;
    } else {
      playerWinPct = (move.black / totalGames) * 100;
      opponentWinPct = (move.white / totalGames) * 100;
    }
    
    const winAdvantage = playerWinPct - opponentWinPct;
    
    // Find appropriate tier based on game count
    let applicableTier = null;
    for (const tier of trickyConfig.tiers) {
      if (totalGames >= tier.minGames && totalGames <= tier.maxGames) {
        applicableTier = tier;
        break;
      }
    }
    
    if (applicableTier && winAdvantage >= applicableTier.minWinAdvantage) {
      this.topMoveChoices++;
      console.log(`🎯 Tricky move qualified! Rank: ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}%, Games: ${totalGames}, Tier: ${applicableTier.minGames}-${applicableTier.maxGames === Infinity ? '+' : applicableTier.maxGames} games (requires +${applicableTier.minWinAdvantage}%) (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
    } else if (applicableTier) {
      console.log(`📊 Tricky move check: Rank ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}% (needs +${applicableTier.minWinAdvantage}%), Games: ${totalGames}`);
    } else {
      console.log(`❌ Not top 3, rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
    }
  },

  // ========================================
  // HINT SYSTEM
  // ========================================
  
  async getHints() {
    if (this.hintUsed) return;
    const fen = this.game.fen();
    
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const topMoves = data.moves ? data.moves.slice(0, 5) : [];
      
      let commanderText = '';
      if (topMoves.length === 0) {
        commanderText = '<em>No moves available in database.</em>';
      } else {
        const moveNames = topMoves.map(m => m.san);
        const first = moveNames[0];
        const second = moveNames[1];
        const others = moveNames.slice(2);
        
        commanderText = `🎖️ <strong>Commander speaks:</strong><br><br>"Soldier, I have seen this position many times.`;
        commanderText += ` March with <strong>${first}</strong> — the most proven line.`;
        if (second) commanderText += ` Or <strong>${second}</strong>, trusted by many.`;
        if (others.length > 0) {
          commanderText += ` Other paths: <strong>${others.join(', ')}</strong>.`;
        }
        commanderText += ` The choice is yours. Good luck."`;
      }
      
      const msgEl = document.getElementById('theoryMessage');
      msgEl.innerHTML = commanderText;
      msgEl.style.display = 'block';
      this.hintUsed = true;
      
      const hintBtn = document.getElementById('hintBtn');
      if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.textContent = '✓ Consulted';
      }
    } catch (error) {
      document.getElementById('theoryMessage').innerHTML = '<em>Unable to fetch hints.</em>';
      document.getElementById('theoryMessage').style.display = 'block';
    }
  },

  // ========================================
  // AI MOVE LOGIC
  // ========================================
  
  async aiMove() {
    const fen = this.game.fen();
    if (this.lastAIMoveFEN === fen) return;
    this.lastAIMoveFEN = fen;
    
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const minGames = this.aiSource === 'master' ? 5 : 20;
      
      // End game if insufficient data
      if (totalGames < minGames || !data.moves || data.moves.length === 0) {
        const gamesData = await ChessAPI.queryGames(this.aiSource, fen);
        this.topGames = gamesData.topGames || [];
        this.recentGames = gamesData.recentGames || [];
        await this.stopGameDueToThinTheory();
        return;
      }
      
      // Filter and select move
      const selectedMove = this.selectAIMove(data.moves);
      const move = this.executeMove(selectedMove);
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.playMoveSound(move);
        this.ui.renderBoard();
        this.queryExplorer();
      }
    } catch (error) {
      console.error('aiMove error:', error);
    }
  },

  selectAIMove(moves) {
    const top5Total = moves.reduce((sum, m) => 
      sum + m.white + m.draws + m.black, 0);
    
    const MIN_PERCENTAGE = 0.10;
    const minMoveGames = top5Total * MIN_PERCENTAGE;
    
    const filteredMoves = moves.filter(m => {
      const moveGames = m.white + m.draws + m.black;
      return moveGames >= minMoveGames;
    });
    
    const movesToUse = filteredMoves.length > 0 ? filteredMoves : [moves[0]];
    const filteredTotal = movesToUse.reduce((sum, m) => 
      sum + m.white + m.draws + m.black, 0);
    
    let rand = Math.random() * filteredTotal;
    let cumulative = 0;
    
    for (const m of movesToUse) {
      cumulative += m.white + m.draws + m.black;
      if (rand <= cumulative) {
        return m;
      }
    }
    
    return movesToUse[0];
  },

  executeMove(selectedMove) {
    if (selectedMove.san === 'O-O' || selectedMove.san === 'O-O-O') {
      return this.game.move(selectedMove.san);
    } else {
      const uci = selectedMove.uci;
      return this.game.move({ 
        from: uci.slice(0,2), 
        to: uci.slice(2,4), 
        promotion: uci.length === 5 ? uci[4] : null 
      });
    }
  },

  // ========================================
  // MAIA PRACTICE MODE
  // ========================================
  
  async maiaMove() {
    console.log('🤖 maiaMove() called');
    
    if (this.game.game_over()) {
      console.log('⚠️ Game is over, showing game over screen');
      setTimeout(() => this.ui.renderPracticeGameOver(), 100);
      return;
    }
    
    const fen = this.game.fen();
    if (this.lastAIMoveFEN === fen) {
      console.log('⚠️ Already processed this position');
      return;
    }
    this.lastAIMoveFEN = fen;
    
    try {
      console.log(`🎯 Requesting move from ${this.maiaLevel}...`);
      const moveUCI = await ChessAPI.getMaiaMove(fen, this.maiaLevel);
      console.log('🔥 Received move:', moveUCI);
      
      if (!moveUCI) {
        console.error('❌ Maia move not available');
        setTimeout(() => this.ui.renderPracticeGameOver(), 100);
        return;
      }
      
      const move = this.parseMaiaMove(moveUCI);
      
      if (move) {
        console.log('✅ Move executed successfully:', move);
        this.lastMove = { from: move.from, to: move.to };
        this.playMoveSound(move);
        this.ui.renderBoard();
        
        if (this.game.game_over()) {
          console.log('🏁 Game over after Maia move');
          setTimeout(() => this.ui.renderPracticeGameOver(), 500);
        }
      } else {
        console.error('❌ Move execution returned null');
      }
    } catch (error) {
      console.error('❌ maiaMove error:', error);
      setTimeout(() => this.ui.renderPracticeGameOver(), 100);
    }
  },

  parseMaiaMove(moveUCI) {
    // Try SAN format first (handles castling and algebraic notation)
    try {
      return this.game.move(moveUCI);
    } catch (e) {
      // Try UCI format (e2e4 style)
      try {
        return this.game.move({
          from: moveUCI.slice(0, 2),
          to: moveUCI.slice(2, 4),
          promotion: moveUCI.length === 5 ? moveUCI[4] : 'q'
        });
      } catch (e2) {
        console.error('❌ Failed to parse move in both formats:', moveUCI);
        return null;
      }
    }
  },

  async continueWithMaia() {
    console.log('🎯 Starting practice mode with Maia');
    
    this.practiceMode = true;
    this.maiaLevel = this.aiSource === 'master' ? 'maia9' : 'maia5';
    this.lastAIMoveFEN = null;
    
    const summaryEl = document.getElementById('endSummary');
    if (summaryEl) summaryEl.style.display = 'none';
    
    const msgEl = document.getElementById('theoryMessage');
    if (msgEl) msgEl.style.display = 'none';
    
    this.ui.renderBoard();
    
    if (this.game.turn() !== this.playerColor) {
      console.log("It's Maia's turn, making move in 800ms...");
      setTimeout(() => this.maiaMove(), 800);
    } else {
      console.log("It's your turn, waiting for player move...");
    }
  },

  // ========================================
  // GAME ENDING
  // ========================================
  
  async stopGameDueToThinTheory() {
    const fen = this.game.fen();
    const rawEval = await ChessAPI.getEvaluation(fen, this.evalCache);
    this.finalPlayerEval = Scoring.getPlayerEval(rawEval, this.playerColor);
    
    const scoreResult = Scoring.getTotalScore(
      this.playerMoves, 
      this.topMoveChoices, 
      this.finalPlayerEval,
      this.aiSource,
      this.qualityTrackedMoves
    );
    
    const score = scoreResult.score;
    const penaltyReason = scoreResult.penaltyReason;
    const battleRank = Scoring.getBattleRank(score, this.finalPlayerEval, penaltyReason, this.aiSource);

    const recentRanks = this.getRecentBattleRanks(this.aiSource);
    recentRanks.push(battleRank.title);
    if (recentRanks.length > 5) recentRanks.shift();
    this.setRecentBattleRanks(this.aiSource, recentRanks);

    await this.updateLegionMerit(score, battleRank.title);

    const moveQuality = Scoring.getMoveQuality(this.topMoveChoices, this.qualityTrackedMoves);
    this.currentPGN = PGNExporter.generatePGN(
      this.game,
      this.playerColor,
      this.aiSource,
      battleRank,
      score,
      moveQuality,
      this.finalPlayerEval
    );

    const displayEval = this.finalPlayerEval > 0 
      ? '+' + this.finalPlayerEval.toFixed(1) 
      : this.finalPlayerEval.toFixed(1);
    const gamesToShow = this.aiSource === 'master' ? this.topGames : this.recentGames;

    this.ui.renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow);
  },

  // ========================================
  // SOUND EFFECTS
  // ========================================
  
  playMoveSound(move) {
    if (typeof RomanBattleEffects === 'undefined') return;
    
    if (move.captured) {
      RomanBattleEffects.playCaptureSound();
    } else if (move.promotion) {
      RomanBattleEffects.playPromotionSound();
    } else {
      RomanBattleEffects.playMoveSound();
    }
  }
});

// Create main app instance with combined functionality
const ChessTheoryApp = ChessGameState;