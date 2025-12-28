import { supabase } from './supabase-client.js';
import { ChessAPI, pieces } from './chess-api.js';
import { Scoring } from './scoring.js';
import { getUser, signInWithGoogle, signOut, loadProgress, saveProgress } from './supabase-client.js';

export class ChessTheoryApp {
  constructor() {
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

    // Load progress from localStorage first — this is instant and always works
    this.legionMerits = JSON.parse(localStorage.getItem('chessTheoryLegionMerits') || '{}');
    this.gamesPlayed = parseInt(localStorage.getItem('chessTheoryGamesPlayed') || '0');
    this.recentBattleRanksMaster = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksMaster') || '[]');
    this.recentBattleRanksLichess = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksLichess') || '[]');

    // Auth state
    this.user = null;
    this.isLoggedIn = false;

    // Set up Supabase auth listener and initial check
    this.setupAuthListener();
    this.checkAuth();

    this.render();
  }

  async checkAuth() {
    const user = await getUser();
    this.user = user;
    this.isLoggedIn = !!user;
    if (this.isLoggedIn) {
      await this.loadCloudProgress();
    }
    this.render();
  }

  setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      this.user = session?.user ?? null;
      this.isLoggedIn = !!this.user;

      if (event === 'SIGNED_IN') {
        await this.loadCloudProgress();
        this.render();
      } else if (event === 'SIGNED_OUT') {
        location.reload(); // Reload to fall back to local progress
      }
    });
  }

  async loadCloudProgress() {
    const progress = await loadProgress();
    if (progress) {
      this.legionMerits = {
        master_merit: progress.master_merit || 0,
        lichess_merit: progress.lichess_merit || 0
      };
      this.gamesPlayed = progress.games_played || 0;
      this.recentBattleRanksMaster = progress.recent_battle_ranks_master || [];
      this.recentBattleRanksLichess = progress.recent_battle_ranks_lichess || [];

      // Keep localStorage in sync as a reliable backup
      this.saveToLocalStorage();
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('chessTheoryLegionMerits', JSON.stringify(this.legionMerits));
    localStorage.setItem('chessTheoryGamesPlayed', this.gamesPlayed.toString());
    localStorage.setItem('chessTheoryRecentBattleRanksMaster', JSON.stringify(this.recentBattleRanksMaster));
    localStorage.setItem('chessTheoryRecentBattleRanksLichess', JSON.stringify(this.recentBattleRanksLichess));
  }

  async saveCloudProgress() {
    if (!this.isLoggedIn) return;

    const progress = {
      master_merit: this.legionMerits.master_merit || 0,
      lichess_merit: this.legionMerits.lichess_merit || 0,
      games_played: this.gamesPlayed,
      recent_battle_ranks_master: this.recentBattleRanksMaster,
      recent_battle_ranks_lichess: this.recentBattleRanksLichess
    };

    await saveProgress(progress);
  }

  async saveAllProgress() {
    this.saveToLocalStorage();      // Always instant local save
    await this.saveCloudProgress(); // Cloud only if logged in
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
    this.saveAllProgress();
  }

  renderBattleHistory(source) {
    const meritKey = `${source}_merit`;
    const currentMerit = this.legionMerits[meritKey] || 0;
    const legionInfo = Scoring.getLegionRank(currentMerit);
    const recentRanks = this.getRecentBattleRanks(source);
    const warning = Scoring.getDemotionWarning(legionInfo.title, recentRanks);

    if (recentRanks.length === 0) return '';

    const battleBadges = recentRanks.map(rank => {
      const letter = rank[0];
      const className = rank.toLowerCase();
      return `<div class="battle-badge ${className}">${letter}</div>`;
    }).join('');

    return `
      <div class="battle-history">
        <div class="battle-history-title">Last ${recentRanks.length} Battle${recentRanks.length > 1 ? 's' : ''}</div>
        <div class="battle-badges">${battleBadges}</div>
        ${warning ? `<div class="warning-message">${warning}</div>` : ''}
      </div>
    `;
  }

  renderMenu() {
    const masterMerit = this.legionMerits.master_merit || 0;
    const clubMerit = this.legionMerits.lichess_merit || 0;
    const masterLegion = Scoring.getLegionRank(masterMerit);
    const clubLegion = Scoring.getLegionRank(clubMerit);
    const masterBattleHistory = this.renderBattleHistory('master');
    const clubBattleHistory = this.renderBattleHistory('lichess');

    const authSection = this.isLoggedIn
      ? `<div style="text-align:center;margin:20px 0;">
           <strong>🔐 Synced as ${this.user.email.split('@')[0]}</strong><br>
           <button class="btn" style="margin-top:8px;" id="signOutBtn">
             Sign Out
           </button>
         </div>`
      : `<div style="text-align:center;margin:20px 0;">
           <button class="btn" id="signInBtn">
             🔐 Sign in with Google to sync across devices
           </button>
           <p style="font-size:0.8rem;color:#aaa;margin-top:10px;">
             No account needed — progress is saved locally and works instantly!
           </p>
         </div>`;

    document.getElementById('app').innerHTML = `
      <div class="menu">
        <h1 class="menu-title">LINES OF THE LEGION</h1>
        <p class="menu-subtitle">
          Hold the line. Survive the opening drawn from real games —
          until theory ends and true battle begins.
        </p>

        ${authSection}

        <div style="font-size:.9rem;line-height:1.5;">
          <div class="legion-card masters">
            <div class="legion-header">🏆 Masters Legion</div>
            <div class="legion-status">
              ${masterLegion.title} (${masterMerit} merit) ${masterLegion.icon}
            </div>
            ${masterLegion.nextRank
              ? `<div class="legion-next">${masterLegion.title} → ${masterLegion.nextRank}: ${masterLegion.pointsNeeded} more</div>`
              : `<div class="legion-next">Highest rank achieved</div>`}
            <div class="rank-progress">
              ${masterLegion.rankOrder.map(r => `<div class="rank-step ${r === masterLegion.title ? 'active' : ''}">${r}</div>`).join('')}
            </div>
            ${masterBattleHistory}
          </div>

          <div class="legion-card club">
            <div class="legion-header">♟️ Club Legion</div>
            <div class="legion-status">
              ${clubLegion.title} (${clubMerit} merit) ${clubLegion.icon}
            </div>
            ${clubLegion.nextRank
              ? `<div class="legion-next">${clubLegion.title} → ${clubLegion.nextRank}: ${clubLegion.pointsNeeded} more</div>`
              : `<div class="legion-next">Highest rank achieved</div>`}
            <div class="rank-progress">
              ${clubLegion.rankOrder.map(r => `<div class="rank-step ${r === clubLegion.title ? 'active' : ''}">${r}</div>`).join('')}
            </div>
            ${clubBattleHistory}
          </div>

          <div style="margin-top:8px;">⚔️ Battles Fought: ${this.gamesPlayed}</div>
        </div>

        <p class="menu-cta">Choose your campaign:</p>
        <div class="menu-actions">
          <button id="masterBtn" class="menu-btn primary">🥷 Master</button>
          <button id="lichessBtn" class="menu-btn primary">🤺 Club</button>
        </div>
        <button id="resetBtn" class="menu-btn reset">↺ Reset Progress</button>
      </div>
    `;

    document.getElementById('masterBtn').onclick = () => this.selectSource('master');
    document.getElementById('lichessBtn').onclick = () => this.selectSource('lichess');
    document.getElementById('resetBtn').onclick = () => this.resetStats();
    
    // Auth button handlers
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
      signInBtn.onclick = () => signInWithGoogle();
    }
    
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.onclick = async () => {
        await signOut();
        location.reload();
      };
    }
  }

  renderColorChoice() {
    document.getElementById('app').innerHTML = `
      <div class="menu">
        <h2>Play As</h2>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;">
          <button id="whiteBtn" class="menu-btn" style="background:#f8f8f8;color:#222;flex:1;">White</button>
          <button id="blackBtn" class="menu-btn" style="background:#333;flex:1;">Black</button>
        </div>
      </div>
    `;
    document.getElementById('whiteBtn').onclick = () => this.selectColor('w');
    document.getElementById('blackBtn').onclick = () => this.selectColor('b');
  }

  renderGameContainer() {
    if (document.querySelector('.game-container')) return;
    document.getElementById('app').innerHTML = `
      <div class="game-container">
        <div class="board-wrapper" id="board"></div>
        <div class="info-line" id="gameCount">Loading position data...</div>
        <div id="endSummary" class="end-summary" style="display:none;"></div>
        <div id="theoryMessage" class="theory-message" style="display:none;"></div>
        <div class="action-buttons">
          <button class="btn" onclick="location.reload()">🔄 New Battle</button>
          <button class="btn" id="hintBtn">🎖️ Consult Commander</button>
        </div>
      </div>
    `;
  }

  renderBoard() {
    this.renderGameContainer();
    const board = this.game.board();
    const isFlipped = this.playerColor === 'b';
    const renderedBoard = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;
    const isPlayerTurn = this.game.turn() === this.playerColor;

    const countEl = document.getElementById('gameCount');
    if (countEl) {
      countEl.textContent = this.gameCount > 0
        ? `Position reached ${this.gameCount.toLocaleString()} times`
        : 'Position data unavailable — continuing...';
    }

    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
      hintBtn.disabled = !isPlayerTurn || this.hintUsed;
      hintBtn.textContent = this.hintUsed ? '✓ Consulted' : '🎖️ Consult Commander';
      hintBtn.onclick = isPlayerTurn && !this.hintUsed ? () => this.getHints() : null;
    }

    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    renderedBoard.forEach((row, r) => {
      row.forEach((square, c) => {
        const actualRow = isFlipped ? 7 - r : r;
        const actualCol = isFlipped ? 7 - c : c;
        const sqName = 'abcdefgh'[actualCol] + (8 - actualRow);
        const isLight = (actualRow + actualCol) % 2 === 0;
        const isSelected = this.selected === sqName;
        const isLastMove = this.lastMove.from === sqName || this.lastMove.to === sqName;

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${!isPlayerTurn ? 'disabled' : ''}`;
        div.onclick = () => this.handleClick(actualRow, actualCol);

        if (square) {
          const img = document.createElement('img');
          img.src = this.pieceImages[square.color + square.type];
          img.className = 'piece';
          div.appendChild(img);
        }
        boardEl.appendChild(div);
      });
    });
  }

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
    this.previousFEN = null;
    this.lastPlayerUCI = null;
    this.lastAIMoveFEN = null;
    this.topGames = [];
    this.recentGames = [];
  }

  resetStats() {
    if (!confirm('Are you sure you want to reset all your stats? This cannot be undone.')) return;

    this.legionMerits = {};
    this.gamesPlayed = 0;
    this.recentBattleRanksMaster = [];
    this.recentBattleRanksLichess = [];

    localStorage.removeItem('chessTheoryLegionMerits');
    localStorage.removeItem('chessTheoryGamesPlayed');
    localStorage.removeItem('chessTheoryRecentBattleRanksMaster');
    localStorage.removeItem('chessTheoryRecentBattleRanksLichess');

    if (this.isLoggedIn) {
      saveProgress({
        master_merit: 0,
        lichess_merit: 0,
        games_played: 0,
        recent_battle_ranks_master: [],
        recent_battle_ranks_lichess: []
      });
    }

    this.render();
  }

  async queryExplorer() {
    const fen = this.game.fen();
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const countEl = document.getElementById('gameCount');
      if (countEl) {
        countEl.textContent = totalGames === 0 ? 'Position data unavailable — continuing...' : `Position reached ${totalGames.toLocaleString()} times`;
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
        this.renderBoard();
        setTimeout(() => this.render(), 100);
        return;
      }
      this.selected = null;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.playerColor) {
      this.selected = square;
    }
    this.renderBoard();
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
        move = this.game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci.length === 5 ? uci[4] : null });
      }
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.renderBoard();
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
    const { score, penaltyReason } = Scoring.getTotalScore(this.playerMoves, this.topMoveChoices, this.finalPlayerEval);
    const battleRank = Scoring.getBattleRank(score, this.finalPlayerEval, penaltyReason);

    const recentRanks = this.getRecentBattleRanks(this.aiSource);
    recentRanks.push(battleRank.title);
    if (recentRanks.length > 5) recentRanks.shift();
    this.setRecentBattleRanks(this.aiSource, recentRanks); // Triggers saveAllProgress()

    const moveQuality = Scoring.getMoveQuality(this.topMoveChoices, this.playerMoves);
    const displayEval = this.finalPlayerEval > 0 ? '+' + this.finalPlayerEval.toFixed(1) : this.finalPlayerEval.toFixed(1);
    const gamesToShow = this.aiSource === 'master' ? this.topGames : this.recentGames;

    const summaryEl = document.getElementById('endSummary');
    const msgEl = document.getElementById('theoryMessage');

    let rankChangeHtml = this.rankChangeMessage
      ? (this.rankChangeMessage.includes('Promoted')
          ? `<div class="promotion-message">${this.rankChangeMessage}</div>`
          : `<div class="demotion-message">${this.rankChangeMessage}</div>`)
      : '';
    this.rankChangeMessage = null;

    let penaltyMsg = battleRank.penaltyReason
      ? `<div style="color:#e74c3c;font-size:.85rem;margin-top:6px;">Penalty: ${battleRank.penaltyReason}</div>`
      : '';

    summaryEl.innerHTML = `
      ${rankChangeHtml}
      <h3>${battleRank.icon} ${battleRank.title} • Score: ${battleRank.score}/100</h3>
      <div class="stats-grid">
        <div>Moves<br><strong>${this.playerMoves}</strong></div>
        <div>Quality<br><strong>${moveQuality}%</strong></div>
        <div>Eval<br><strong>${displayEval}</strong></div>
      </div>
      <div style="font-style:italic;color:#bbb;margin:8px 0;">"${battleRank.msg}"</div>
      <div style="font-size:.85rem;color:#aaa;"><em>${battleRank.sub}</em></div>
      <div class="rank-progress">
        ${['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'].map(r => `<div class="rank-step ${r === battleRank.title ? 'active' : ''}">${r}</div>`).join('')}
      </div>
      ${penaltyMsg}
    `;
    summaryEl.style.display = 'block';

    let html = `<strong>Historical games from this position:</strong><br>`;
    if (gamesToShow.length > 0) {
      gamesToShow.forEach((game, idx) => {
        const whitePlayer = game.white?.name || 'Unknown';
        const blackPlayer = game.black?.name || 'Unknown';
        const whiteRating = game.white?.rating || '?';
        const blackRating = game.black?.rating || '?';
        const year = game.year || '';
        const gameId = game.id || '';
        const gameUrl = gameId ? `https://lichess.org/${gameId}` : '#';
        let resultText = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½';
        let resultColor = game.winner === 'white' ? '#fff' : game.winner === 'black' ? '#ccc' : '#f1c40f';
        html += `<div class="game-list-item">
          <strong>${idx + 1}.</strong> ${whitePlayer} (${whiteRating}) – ${blackPlayer} (${blackRating})${year ? `, ${year}` : ''}<br>
          <span style="color:${resultColor};">${resultText}</span> • <a href="${gameUrl}" target="_blank">View ↗</a>
        </div>`;
      });
    } else {
      html += '<em style="color:#888;">No games found.</em>';
    }
    msgEl.innerHTML = html;
    msgEl.style.display = 'block';
  }

  async updateLegionMerit(score) {
    const meritKey = `${this.aiSource}_merit`;
    const oldMerit = this.legionMerits[meritKey] || 0;
    const oldLegion = Scoring.getLegionRank(oldMerit);
    let newMerit = oldMerit + score;
    const tempLegion = Scoring.getLegionRank(newMerit);
    let rankChanged = false;

    if (tempLegion.level > oldLegion.level) {
      newMerit = tempLegion.thresholds[tempLegion.level];
      this.rankChangeMessage = `⚔️ Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. 🍷`;
      rankChanged = true;
    }

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

    if (rankChanged) {
      this.setRecentBattleRanks(this.aiSource, []);
    }

    this.legionMerits[meritKey] = newMerit;
    this.gamesPlayed++;

    await this.saveAllProgress(); // Saves locally + cloud (if logged in)
  }

  render() {
    if (!this.aiSource) {
      this.renderMenu();
      return;
    }
    if (!this.playerColor) {
      this.renderColorChoice();
      return;
    }

    this.renderBoard();
    this.queryExplorer();

    if (this.game.turn() !== this.playerColor) {
      const currentFEN = this.game.fen();
      if (this.lastAIMoveFEN !== currentFEN) {
        setTimeout(() => this.aiMove(), 800);
      }
    }
  }
}


