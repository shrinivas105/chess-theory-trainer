// chess-game-state.js - Game State Management & Data Storage
// Handles: initialization, state management, storage, stats tracking

class ChessGameState {
  constructor() {
    // Core game state
    this.game = new Chess();
    this.playerColor = null;
    this.aiSource = null;
    this.selected = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.evalCache = {};
    this.lastAIMoveFEN = null;
    
    // Move tracking
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    
    // Game data
    this.topGames = [];
    this.recentGames = [];
    this.pieceImages = pieces;
    this.rankChangeMessage = null;
    this.currentPGN = null;
    this.accuracyBonus = 0;
    this.accuracyTier = null;
    
    // Practice mode
    this.practiceMode = false;
    this.maiaLevel = null;

    // Load saved progress
    this.loadProgress();
    
    // Initialize modules
    this.auth = new AuthModule(this);
    this.ui = new UIRenderer(this);
    this.analysisBoard = new AnalysisBoard(this);
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  
  async init() {
    await this.auth.initialize();
    this.render();
  }

  // ========================================
  // PROGRESS LOADING & SAVING
  // ========================================
  
  loadProgress() {
    this.legionMerits = JSON.parse(localStorage.getItem('chessTheoryLegionMerits') || '{}');
    this.gamesPlayedMaster = parseInt(localStorage.getItem('chessTheoryGamesPlayedMaster') || '0');
    this.gamesPlayedLichess = parseInt(localStorage.getItem('chessTheoryGamesPlayedLichess') || '0');
    this.recentBattleRanksMaster = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksMaster') || '[]');
    this.recentBattleRanksLichess = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksLichess') || '[]');
    this.lastColorMaster = localStorage.getItem('chessTheoryLastColorMaster') || null;
    this.lastColorLichess = localStorage.getItem('chessTheoryLastColorLichess') || null;
  }

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

  // ========================================
  // STATE ACCESSORS
  // ========================================
  
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

  // ========================================
  // GAME FLOW CONTROL
  // ========================================
  
  goHome() {
    this.playerColor = null;
    this.aiSource = null;
    this.resetGameState();
    this.render();
  }

  selectSource(source) {
    this.aiSource = source;
    this.render();
  }

  startBattle() {
    const lastColor = this.aiSource === 'master' ? this.lastColorMaster : this.lastColorLichess;
    const nextColor = !lastColor ? 'w' : (lastColor === 'w' ? 'b' : 'w');
    
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }
    
    console.log(`🎯 Starting battle - Last color: ${lastColor || 'none'}, Next color: ${nextColor}`);
    
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
    this.practiceMode = false;
    this.maiaLevel = null;
  }

  // ========================================
  // MERIT & RANK UPDATES
  // ========================================
  
  async updateLegionMerit(score, battleRankTitle) {
    const meritKey = `${this.aiSource}_merit`;
    const oldMerit = this.legionMerits[meritKey] || 0;
    const oldLegion = Scoring.getLegionRank(oldMerit);
    let newMerit = oldMerit + score;
    const tempLegion = Scoring.getLegionRank(newMerit);
    let rankChanged = false;

    const recentRanks = this.getRecentBattleRanks(this.aiSource);

    const demotionCheck = Scoring.checkDemotion(oldLegion.title, recentRanks, battleRankTitle, oldMerit);
    
    if (demotionCheck && demotionCheck.demote) {
      newMerit = demotionCheck.newMerit;
      this.rankChangeMessage = demotionCheck.message;
      rankChanged = true;
      this.setRecentBattleRanks(this.aiSource, []);
    } else {
      if (Scoring.canPromote(oldLegion.title, newMerit, recentRanks) && tempLegion.level > oldLegion.level) {
        newMerit = tempLegion.thresholds[tempLegion.level];
        this.rankChangeMessage = `⚔️ Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. 🏺`;
        rankChanged = true;
        this.setRecentBattleRanks(this.aiSource, []);
      }
    }

    this.legionMerits[meritKey] = newMerit;
    
    if (this.aiSource === 'master') {
      this.gamesPlayedMaster++;
      this.lastColorMaster = this.playerColor;
    } else {
      this.gamesPlayedLichess++;
      this.lastColorLichess = this.playerColor;
    }

    await this.saveAllProgress();
  }

  // ========================================
  // EXPORT FUNCTIONS
  // ========================================
  
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
    
    window.analysisBoard = this.analysisBoard;
    await this.analysisBoard.initializeAnalysis();
  }

  // ========================================
  // MAIN RENDER
  // ========================================
  
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
    
    if (!this.practiceMode) {
      this.queryExplorer();
    }

    if (this.game.turn() !== this.playerColor && !this.game.game_over()) {
      const currentFEN = this.game.fen();
      if (this.lastAIMoveFEN !== currentFEN) {
        if (this.practiceMode) {
          setTimeout(() => this.maiaMove(), 800);
        } else {
          setTimeout(() => this.aiMove(), 800);
        }
      }
    }
    
    if (this.game.game_over() && this.practiceMode) {
      setTimeout(() => this.ui.renderPracticeGameOver(), 100);
    }
  }
}