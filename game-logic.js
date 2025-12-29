// game-logic.js - Core chess game logic and state management
// FIXED: Demotion now properly updates merit BEFORE saving to cloud

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
    this.hintUsed = false;
    this.topGames = [];
    this.recentGames = [];
    this.pieceImages = pieces;
    this.rankChangeMessage = null;

    // Load progress from localStorage first
    this.legionMerits = JSON.parse(localStorage.getItem('chessTheoryLegionMerits') || '{}');
    this.gamesPlayed = parseInt(localStorage.getItem('chessTheoryGamesPlayed') || '0');
    this.recentBattleRanksMaster = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksMaster') || '[]');
    this.recentBattleRanksLichess = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksLichess') || '[]');

    // Initialize modules
    this.auth = new AuthModule(this);
    this.ui = new UIRenderer(this);

    // Initialize auth and render
    this.init();
  }

  async init() {
    await this.auth.initialize();
    this.render();
  }

  // Storage methods
  saveToLocalStorage() {
    localStorage.setItem('chessTheoryLegionMerits', JSON.stringify(this.legionMerits));
    localStorage.setItem('chessTheoryGamesPlayed', this.gamesPlayed.toString());
    localStorage.setItem('chessTheoryRecentBattleRanksMaster', JSON.stringify(this.recentBattleRanksMaster));
    localStorage.setItem('chessTheoryRecentBattleRanksLichess', JSON.stringify(this.recentBattleRanksLichess));
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
    // Note: Don't save here - let caller control when to save
  }

  // Game flow methods
  selectSource(source) {
    this.aiSource = source;
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
    this.hintUsed = false;
    this.lastAIMoveFEN = null;
    this.topGames = [];
    this.recentGames = [];
  }

  async resetStats() {
    if (!confirm('Are you sure you want to reset all your stats? This cannot be undone.')) return;

    this.legionMerits = {};
    this.gamesPlayed = 0;
    this.recentBattleRanksMaster = [];
    this.recentBattleRanksLichess = [];

    localStorage.removeItem('chessTheoryLegionMerits');
    localStorage.removeItem('chessTheoryGamesPlayed');
    localStorage.removeItem('chessTheoryRecentBattleRanksMaster');
    localStorage.removeItem('chessTheoryRecentBattleRanksLichess');

    if (this.auth.isLoggedIn) {
      await saveProgress({
        master_merit: 0,
        lichess_merit: 0,
        games_played: 0,
        recent_battle_ranks_master: [],
        recent_battle_ranks_lichess: []
      });
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
      const data = await ChessAPI.queryExplorer(this.aiSource, prevFEN);
      if (data.moves && data.moves.length > 0) {
        const isTop3 = data.moves.slice(0, 3).some(m => m.uci === playerUCI);
        if (isTop3) this.topMoveChoices++;
      }
    } catch (e) {}
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
      
      let rand = Math.random() * totalGames;
      let cumulative = 0;
      let selectedMove = data.moves[0];
      for (const m of data.moves) {
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
    const { score, penaltyReason } = Scoring.getTotalScore(
      this.playerMoves, 
      this.topMoveChoices, 
      this.finalPlayerEval
    );
    const battleRank = Scoring.getBattleRank(score, this.finalPlayerEval, penaltyReason);

    // Update recent battle ranks
    const recentRanks = this.getRecentBattleRanks(this.aiSource);
    recentRanks.push(battleRank.title);
    if (recentRanks.length > 5) recentRanks.shift();
    this.setRecentBattleRanks(this.aiSource, recentRanks);

    // Update legion merit (this handles promotion/demotion)
    await this.updateLegionMerit(score);

    // Render end game summary
    const moveQuality = Scoring.getMoveQuality(this.topMoveChoices, this.playerMoves);
    const displayEval = this.finalPlayerEval > 0 
      ? '+' + this.finalPlayerEval.toFixed(1) 
      : this.finalPlayerEval.toFixed(1);
    const gamesToShow = this.aiSource === 'master' ? this.topGames : this.recentGames;

    this.ui.renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow);
  }

  async updateLegionMerit(score) {
    const meritKey = `${this.aiSource}_merit`;
    const oldMerit = this.legionMerits[meritKey] || 0;
    const oldLegion = Scoring.getLegionRank(oldMerit);
    let newMerit = oldMerit + score;
    const tempLegion = Scoring.getLegionRank(newMerit);
    let rankChanged = false;

    // Check for promotion
    if (tempLegion.level > oldLegion.level) {
      newMerit = tempLegion.thresholds[tempLegion.level];
      this.rankChangeMessage = `⚔️ Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. 🍺`;
      rankChanged = true;
    }

    // Check for demotion
    const newLegion = Scoring.getLegionRank(newMerit);
    const recentRanks = this.getRecentBattleRanks(this.aiSource);
    const levyCount = recentRanks.filter(r => r === 'Levy').length;
    const hastatusCount = recentRanks.filter(r => r === 'Hastatus').length;
    const principesCount = recentRanks.filter(r => r === 'Principes').length;
    let demoted = false;

    if (newLegion.title === 'Legionary' && levyCount >= 3) demoted = true;
    else if (newLegion.title === 'Optio' && (levyCount >= 3 || (levyCount >= 2 && hastatusCount >= 1))) demoted = true;
    else if ((newLegion.title === 'Centurion' || newLegion.title === 'Tribunus') && (levyCount + hastatusCount) >= 3) demoted = true;
    else if (newLegion.title === 'Legatus' && (levyCount + hastatusCount + principesCount) >= 3) demoted = true;

    if (demoted && newLegion.level > 0) {
      const newLevel = newLegion.level - 1;
      const newRankTitle = newLegion.rankOrder[newLevel];
      newMerit = newLegion.thresholds[newLevel];
      this.rankChangeMessage = `⚔️ Commander: Your failures demand punishment. You are demoted to ${newRankTitle}! Rise or perish!`;
      rankChanged = true;
    }

    // CRITICAL FIX: Update merit BEFORE clearing recent ranks
    this.legionMerits[meritKey] = newMerit;
    this.gamesPlayed++;

    // Now clear recent ranks if rank changed (promotion or demotion)
    if (rankChanged) {
      this.setRecentBattleRanks(this.aiSource, []);
    }

    // Save everything to both localStorage and cloud
    await this.saveAllProgress();
  }

  // Main render method
  render() {
    if (!this.aiSource) {
      this.ui.renderMenu();
      return;
    }
    if (!this.playerColor) {
      this.ui.renderColorChoice();
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