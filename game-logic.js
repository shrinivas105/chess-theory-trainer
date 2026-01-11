// game-logic.js - Core chess game logic and state management
// UPDATED: Hidden accuracy bonus system (eval >= +0.5)

class ChessTheoryApp {
  constructor() {
    // Game state
    this.game = new Chess();
    this.playerColor = null;
    this.aiSource = null;
    this.selected = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.evalCache = {};
    this.lastAIMoveFEN = null;
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    this.topGames = [];
    this.recentGames = [];
    this.pieceImages = pieces;
    this.rankChangeMessage = null;
    this.currentPGN = null;
    this.accuracyBonus = 0;  // NEW: Track accuracy bonus
    this.accuracyTier = null; // NEW: Track accuracy tier name
	 this.gameEnded = false; // ← ADDED THIS
  this.endGameData = null; // ← ADDED THIS

    // Load progress from localStorage first
    this.legionMerits = JSON.parse(localStorage.getItem('chessTheoryLegionMerits') || '{}');
    this.gamesPlayedMaster = parseInt(localStorage.getItem('chessTheoryGamesPlayedMaster') || '0');
    this.gamesPlayedLichess = parseInt(localStorage.getItem('chessTheoryGamesPlayedLichess') || '0');
    this.recentBattleRanksMaster = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksMaster') || '[]');
    this.recentBattleRanksLichess = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksLichess') || '[]');
    this.lastColorMaster = localStorage.getItem('chessTheoryLastColorMaster') || null;
    this.lastColorLichess = localStorage.getItem('chessTheoryLastColorLichess') || null;

    // Initialize modules
    this.auth = new AuthModule(this);
    this.ui = new UIRenderer(this);
    this.analysisBoard = new AnalysisBoard(this);

    // Initialize auth and render
    this.init();
  }

  async init() {
    await this.auth.initialize();
    this.render();
  }

  goHome() {
    this.playerColor = null;
    this.aiSource = null;
    this.resetGameState();
    this.render();
  }

  // Storage methods
  saveToLocalStorage() {
    localStorage.setItem('chessTheoryLegionMerits', JSON.stringify(this.legionMerits));
    localStorage.setItem('chessTheoryGamesPlayedMaster', this.gamesPlayedMaster.toString());
    localStorage.setItem('chessTheoryGamesPlayedLichess', this.gamesPlayedLichess.toString());
    localStorage.setItem('chessTheoryRecentBattleRanksMaster', JSON.stringify(this.recentBattleRanksMaster));
    localStorage.setItem('chessTheoryRecentBattleRanksLichess', JSON.stringify(this.recentBattleRanksLichess));
    localStorage.setItem('chessTheoryLastColorMaster', this.lastColorMaster || '');
    localStorage.setItem('chessTheoryLastColorLichess', this.lastColorLichess || '');
  }

  async saveAllProgress() {
    this.saveToLocalStorage();
    await this.auth.saveCloudProgress();
  }

  getRecentBattleRanks(source) {
    return source === 'master' ? this.recentBattleRanksMaster : this.recentBattleRanksLichess;
  }

  setRecentBattleRanks(source, ranks) {
    if (source === 'master') {
      this.recentBattleRanksMaster = ranks;
    } else {
      this.recentBattleRanksLichess = ranks;
    }
  }

  // Game flow methods
  selectSource(source) {
    this.aiSource = source;
    this.render();
  }

  startBattle() {
    // Determine next color based on last played color
    const lastColor = this.aiSource === 'master' ? this.lastColorMaster : this.lastColorLichess;
    const nextColor = !lastColor ? 'w' : (lastColor === 'w' ? 'b' : 'w');
    
	// STOP the music here
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }
	
    console.log(`🎯 Starting battle - Last color: ${lastColor || 'none'}, Next color: ${nextColor}`);
    
    // Set player color and start game
    this.playerColor = nextColor;
    this.hintUsed = false;
    this.resetGameState();
    this.render();
  }

  selectColor(color) {
    this.playerColor = color;
    this.hintUsed = false;
    this.resetGameState();
    this.render();
  }

  resetGameState() {
    this.game.reset();
    this.selected = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    this.lastAIMoveFEN = null;
    this.topGames = [];
    this.recentGames = [];
    this.currentPGN = null;
      this.gameEnded = false; // ← ADDED THIS
  this.endGameData = null; // ← ADDED THIS
  }

  async resetStats() {
    if (!confirm('Are you sure you want to reset all your stats? This cannot be undone.')) return;

    this.legionMerits = {};
    this.gamesPlayedMaster = 0;
    this.gamesPlayedLichess = 0;
    this.recentBattleRanksMaster = [];
    this.recentBattleRanksLichess = [];
    this.lastColorMaster = null;
    this.lastColorLichess = null;

    localStorage.removeItem('chessTheoryLegionMerits');
    localStorage.removeItem('chessTheoryGamesPlayedMaster');
    localStorage.removeItem('chessTheoryGamesPlayedLichess');
    localStorage.removeItem('chessTheoryRecentBattleRanksMaster');
    localStorage.removeItem('chessTheoryRecentBattleRanksLichess');
    localStorage.removeItem('chessTheoryLastColorMaster');
    localStorage.removeItem('chessTheoryLastColorLichess');

    if (this.auth.isLoggedIn) {
      await this.auth.saveCloudProgress();
    }

    this.render();
  }

  // Chess API methods
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
  }

  async handleClick(row, col) {
    if (this.game.turn() !== this.playerColor || this.game.game_over()) return;
    const square = 'abcdefgh'[col] + (8 - row);

    if (this.selected) {
      const moveOptions = { from: this.selected, to: square, promotion: 'q' };
      const preMoveFEN = this.game.fen();
      let move = this.game.move(moveOptions);
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.playerMoves++;
        
        // Play sound effects based on move type
        console.log('Attempting to play sound...');
        if (typeof RomanBattleEffects !== 'undefined') {
          if (move.captured) {
            RomanBattleEffects.playCaptureSound();
          } else if (move.promotion) {
            RomanBattleEffects.playPromotionSound();
          } else {
            RomanBattleEffects.playMoveSound();
          }
        } else {
          console.error('RomanBattleEffects not loaded!');
        }
        
        const moveUCI = move.from + move.to + (move.promotion || '');
        await this.checkMoveQuality(preMoveFEN, moveUCI);
        this.selected = null;
        document.getElementById('theoryMessage').style.display = 'none';
        this.ui.renderBoard();
        setTimeout(() => this.render(), 100);
        return;
      }
      this.selected = null;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.playerColor) {
      this.selected = square;
    }
    this.ui.renderBoard();
  }

async checkMoveQuality(prevFEN, playerUCI) {
    try {
      this.qualityTrackedMoves++;
      
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
      
      const isTop3 = moveIndex < 3;
      
      if (isTop3) {
        // Check if this "top move" is actually bad compared to other top moves
        const playerMove = data.moves[moveIndex];
        const playerTotalGames = playerMove.white + playerMove.draws + playerMove.black;
        
        // Calculate player's win percentage and opponent's win percentage
        let playerWinPct, opponentWinPct;
        if (this.playerColor === 'w') {
          playerWinPct = (playerMove.white / playerTotalGames) * 100;
          opponentWinPct = (playerMove.black / playerTotalGames) * 100;
        } else {
          playerWinPct = (playerMove.black / playerTotalGames) * 100;
          opponentWinPct = (playerMove.white / playerTotalGames) * 100;
        }
        
        const playerWinRatio = opponentWinPct > 0 ? playerWinPct / opponentWinPct : 999;
        
        // Get other top 3 moves (excluding player's move)
        const otherTopMoves = data.moves.slice(0, 3).filter((_, idx) => idx !== moveIndex);
        
        if (otherTopMoves.length >= 2) {
          // Calculate win percentages for other top moves
          const otherWinPercentages = otherTopMoves.map(move => {
            const total = move.white + move.draws + move.black;
            if (this.playerColor === 'w') {
              return (move.white / total) * 100;
            } else {
              return (move.black / total) * 100;
            }
          });
          
          // Calculate win ratios for other top moves
          const otherWinRatios = otherTopMoves.map(move => {
            const total = move.white + move.draws + move.black;
            let winPct, losePct;
            if (this.playerColor === 'w') {
              winPct = (move.white / total) * 100;
              losePct = (move.black / total) * 100;
            } else {
              winPct = (move.black / total) * 100;
              losePct = (move.white / total) * 100;
            }
            return losePct > 0 ? winPct / losePct : 999;
          });
          
          // Condition 1: Check if gap is > 20%
          const lowestOtherWinPct = Math.min(...otherWinPercentages);
          const winPctGap = lowestOtherWinPct - playerWinPct;
          const condition1 = winPctGap > 20;
          
          // Condition 2: Player ratio < 1.0 AND both other moves > 1.0
          const condition2 = playerWinRatio < 1.0 && otherWinRatios.every(ratio => ratio > 1.0);
          
          // If BOTH conditions are true, this is a bad top move
          if (condition1 && condition2) {
            console.log(`⚠️ Bad top move detected! Rank: ${moveIndex + 1}, Player win: ${playerWinPct.toFixed(1)}%, Opponent win: ${opponentWinPct.toFixed(1)}%, Ratio: ${playerWinRatio.toFixed(2)}, Gap: ${winPctGap.toFixed(1)}%, Other ratios: [${otherWinRatios.map(r => r.toFixed(2)).join(', ')}] - NOT counting as quality move (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
            return;
          }
        }
        
        this.topMoveChoices++;
        console.log(`✅ Top 3 move! Rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }
      
      // NEW TIERED TRICKY MOVE SYSTEM (Ranks 5-20)
      const trickyConfig = this.aiSource === 'master' ? MASTER_TRICKY_MOVE : CLUB_TRICKY_MOVE;
      
      if (trickyConfig.enabled && moveIndex >= (trickyConfig.minRank - 1) && moveIndex <= (trickyConfig.maxRank - 1)) {
        const move = data.moves[moveIndex];
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
        
        // Find the appropriate tier based on game count
        let applicableTier = null;
        for (const tier of trickyConfig.tiers) {
          if (totalGames >= tier.minGames && totalGames <= tier.maxGames) {
            applicableTier = tier;
            break;
          }
        }
        
        if (applicableTier) {
          const meetsWinAdvantage = winAdvantage >= applicableTier.minWinAdvantage;
          
          if (meetsWinAdvantage) {
            this.topMoveChoices++;
            console.log(`🎯 Tricky move qualified! Rank: ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}%, Games: ${totalGames}, Tier: ${applicableTier.minGames}-${applicableTier.maxGames === Infinity ? '+' : applicableTier.maxGames} games (requires +${applicableTier.minWinAdvantage}%) (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
            return;
          } else {
            console.log(`📊 Tricky move check: Rank ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}% (needs +${applicableTier.minWinAdvantage}%), Games: ${totalGames}`);
          }
        }
      }
      
      console.log(`❌ Not top 3, rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
    } catch (e) {
      console.error('Quality check error:', e);
    }
  }

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
        commanderText = `🎖️ <strong>Commander speaks:</strong><br><br>
        "Soldier, I have seen this position many times.`;
        commanderText += ` March with <strong>${first}</strong> — the most proven line.`;
        if (second) commanderText += ` Or <strong>${second}</strong>, trusted by many.`;
        if (others.length > 0) {
          const othersList = others.join(', ');
          commanderText += ` Other paths: <strong>${othersList}</strong>.`;
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
  }

  async aiMove() {
    const fen = this.game.fen();
    if (this.lastAIMoveFEN === fen) return;
    this.lastAIMoveFEN = fen;
    
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const minGames = this.aiSource === 'master' ? 5 : 20;
      
      if (totalGames < minGames || !data.moves || data.moves.length === 0) {
        const gamesData = await ChessAPI.queryGames(this.aiSource, fen);
        this.topGames = gamesData.topGames || [];
        this.recentGames = gamesData.recentGames || [];
        await this.stopGameDueToThinTheory();
        return;
      }
      
      // Calculate total from top 5 moves only
      const top5Total = data.moves.reduce((sum, m) => 
        sum + m.white + m.draws + m.black, 0);
      
      // Filter out moves < 10% of top 5 total
      const MIN_PERCENTAGE = 0.10;
      const minMoveGames = top5Total * MIN_PERCENTAGE;
      
      const filteredMoves = data.moves.filter(m => {
        const moveGames = m.white + m.draws + m.black;
        return moveGames >= minMoveGames;
      });
      
      // If all filtered out (edge case), keep at least top move
      const movesToUse = filteredMoves.length > 0 ? filteredMoves : [data.moves[0]];
      
      // Calculate new total from filtered moves
      const filteredTotal = movesToUse.reduce((sum, m) => 
        sum + m.white + m.draws + m.black, 0);
      
      // Weighted random selection from filtered moves
      let rand = Math.random() * filteredTotal;
      let cumulative = 0;
      let selectedMove = movesToUse[0];
      
      for (const m of movesToUse) {
        cumulative += m.white + m.draws + m.black;
        if (rand <= cumulative) {
          selectedMove = m;
          break;
        }
      }
      
      let move = null;
      if (selectedMove.san === 'O-O' || selectedMove.san === 'O-O-O') {
        move = this.game.move(selectedMove.san);
      } else {
        const uci = selectedMove.uci;
        move = this.game.move({ 
          from: uci.slice(0,2), 
          to: uci.slice(2,4), 
          promotion: uci.length === 5 ? uci[4] : null 
        });
      }
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        
        // Play sound effects for AI moves
        console.log('AI move - attempting to play sound...');
        if (typeof RomanBattleEffects !== 'undefined') {
          if (move.captured) {
            RomanBattleEffects.playCaptureSound();
          } else if (move.promotion) {
            RomanBattleEffects.playPromotionSound();
          } else {
            RomanBattleEffects.playMoveSound();
          }
        } else {
          console.error('RomanBattleEffects not loaded for AI move!');
        }
        
        this.ui.renderBoard();
        this.queryExplorer();
      }
    } catch (error) {
      console.error('aiMove error:', error);
    }
  }

  async stopGameDueToThinTheory() {
    const fen = this.game.fen();
    const rawEval = await ChessAPI.getEvaluation(fen, this.evalCache);
    this.finalPlayerEval = Scoring.getPlayerEval(rawEval, this.playerColor);
    
    // Get score with hidden accuracy bonus (user doesn't see bonus breakdown)
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

    // Use qualityTrackedMoves for display quality percentage
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

  this.gameEnded = true;
  this.endGameData = {
    battleRank,
    moveQuality,
    displayEval,
    gamesToShow
  };

    this.ui.renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow);
  }

  async updateLegionMerit(score, battleRankTitle) {
    const meritKey = `${this.aiSource}_merit`;
    const oldMerit = this.legionMerits[meritKey] || 0;
    const oldLegion = Scoring.getLegionRank(oldMerit);
    let newMerit = oldMerit + score;
    const tempLegion = Scoring.getLegionRank(newMerit);
    let rankChanged = false;

    // Get recent battle ranks for demotion check
    const recentRanks = this.getRecentBattleRanks(this.aiSource);

    // Check for demotion FIRST (pass oldMerit to check safety net)
    const demotionCheck = Scoring.checkDemotion(oldLegion.title, recentRanks, battleRankTitle, oldMerit);
    
    if (demotionCheck && demotionCheck.demote) {
      // Apply demotion (or safety net reset)
      newMerit = demotionCheck.newMerit;
      this.rankChangeMessage = demotionCheck.message;
      rankChanged = true;
      // Clear battle history on demotion/reset
      this.setRecentBattleRanks(this.aiSource, []);
    } else {
      // Check if player can be promoted (merit + requirements met)
      if (Scoring.canPromote(oldLegion.title, newMerit, recentRanks) && tempLegion.level > oldLegion.level) {
        // Promotion happens
        newMerit = tempLegion.thresholds[tempLegion.level];
        this.rankChangeMessage = `⚔️ Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. 🏺`;
        rankChanged = true;
        // Clear battle history on promotion
        this.setRecentBattleRanks(this.aiSource, []);
      }
    }

    // Update merit
    this.legionMerits[meritKey] = newMerit;
    
    // Update games played count
    if (this.aiSource === 'master') {
      this.gamesPlayedMaster++;
    } else {
      this.gamesPlayedLichess++;
    }

    // Save last played color for alternation
    if (this.aiSource === 'master') {
      this.lastColorMaster = this.playerColor;
    } else {
      this.lastColorLichess = this.playerColor;
    }

    await this.saveAllProgress();
  }

  downloadPGN() {
    if (this.currentPGN) {
      PGNExporter.downloadPGN(this.currentPGN);
    }
  }

  copyPGN() {
    if (this.currentPGN) {
      PGNExporter.copyPGNToClipboard(this.currentPGN);
    }
  }

 async showAnalysis() {
    console.log('📊 Show Analysis called');
    
    if (!this.analysisBoard) {
      console.error('❌ Analysis board not initialized');
      alert('Analysis board not available. Please refresh the page.');
      return;
    }
    
    // Show loading indicator
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px;">
          <div style="font-size: 3rem;">⚔️</div>
          <div style="color: var(--roman-gold); font-size: 1.2rem; font-weight: bold;">
            Analyzing Battle...
          </div>
          <div style="color: #888; font-size: 0.9rem;">
            Evaluating all positions...
          </div>
        </div>
      `;
    }
    
    // Make the analysis board accessible globally for onclick handlers
    window.analysisBoard = this.analysisBoard;
    
    await this.analysisBoard.initializeAnalysis();
  }

render() {
  if (!this.aiSource) {
    this.ui.renderMenu();
    return;
  }
  if (!this.playerColor) {
    this.ui.renderColorChoice();
    return;
  }

  // If game has ended, show end summary with final board position
  if (this.gameEnded && this.endGameData) {
    // First render the end summary (which creates container if needed)
    this.ui.renderEndGameSummary(
      this.endGameData.battleRank,
      this.endGameData.moveQuality,
      this.endGameData.displayEval,
      this.endGameData.gamesToShow
    );
    
    // Then render the board with final position (after container exists)
    setTimeout(() => {
      this.ui.renderBoard();
    }, 50);
    return;
  }

  this.ui.renderBoard();
  this.queryExplorer();

  if (this.game.turn() !== this.playerColor) {
    const currentFEN = this.game.fen();
    if (this.lastAIMoveFEN !== currentFEN) {
      setTimeout(() => this.aiMove(), 800);
    }
  }
}
}