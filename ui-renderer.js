// ui-renderer.js - Handles all UI rendering logic

class UIRenderer {
  constructor(app) {
    this.app = app;
  }

  renderBattleHistory(source) {
    const meritKey = `${source}_merit`;
    const currentMerit = this.app.legionMerits[meritKey] || 0;
    const legionInfo = Scoring.getLegionRank(currentMerit);
    const recentRanks = this.app.getRecentBattleRanks(source);
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
    const masterMerit = this.app.legionMerits.master_merit || 0;
    const clubMerit = this.app.legionMerits.lichess_merit || 0;
    const masterLegion = Scoring.getLegionRank(masterMerit);
    const clubLegion = Scoring.getLegionRank(clubMerit);
    const masterBattleHistory = this.renderBattleHistory('master');
    const clubBattleHistory = this.renderBattleHistory('lichess');

    const authSection = this.app.auth.renderAuthSection();

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

          <div style="margin-top:8px;">⚔️ Battles Fought: ${this.app.gamesPlayed}</div>
        </div>

        <p class="menu-cta">Choose your campaign:</p>
        <div class="menu-actions">
          <button id="masterBtn" class="menu-btn primary">🥷 Master</button>
          <button id="lichessBtn" class="menu-btn primary">🤺 Club</button>
        </div>
        <button id="resetBtn" class="menu-btn reset">↺ Reset Progress</button>
      </div>
    `;

    document.getElementById('masterBtn').onclick = () => this.app.selectSource('master');
    document.getElementById('lichessBtn').onclick = () => this.app.selectSource('lichess');
    document.getElementById('resetBtn').onclick = () => this.app.resetStats();
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
    document.getElementById('whiteBtn').onclick = () => this.app.selectColor('w');
    document.getElementById('blackBtn').onclick = () => this.app.selectColor('b');
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
    const board = this.app.game.board();
    const isFlipped = this.app.playerColor === 'b';
    const renderedBoard = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;
    const isPlayerTurn = this.app.game.turn() === this.app.playerColor;

    const countEl = document.getElementById('gameCount');
    if (countEl) {
      countEl.textContent = this.app.gameCount > 0
        ? `Position reached ${this.app.gameCount.toLocaleString()} times`
        : 'Position data unavailable — continuing...';
    }

    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
      hintBtn.disabled = !isPlayerTurn || this.app.hintUsed;
      hintBtn.textContent = this.app.hintUsed ? '✓ Consulted' : '🎖️ Consult Commander';
      hintBtn.onclick = isPlayerTurn && !this.app.hintUsed ? () => this.app.getHints() : null;
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
        const isSelected = this.app.selected === sqName;
        const isLastMove = this.app.lastMove.from === sqName || this.app.lastMove.to === sqName;

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${!isPlayerTurn ? 'disabled' : ''}`;
        div.onclick = () => this.app.handleClick(actualRow, actualCol);

        if (square) {
          const img = document.createElement('img');
          img.src = this.app.pieceImages[square.color + square.type];
          img.className = 'piece';
          div.appendChild(img);
        }
        boardEl.appendChild(div);
      });
    });
  }

  renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow) {
    const summaryEl = document.getElementById('endSummary');
    const msgEl = document.getElementById('theoryMessage');

    let rankChangeHtml = this.app.rankChangeMessage
      ? (this.app.rankChangeMessage.includes('promoted')
          ? `<div class="promotion-message">${this.app.rankChangeMessage}</div>`
          : `<div class="demotion-message">${this.app.rankChangeMessage}</div>`)
      : '';
    this.app.rankChangeMessage = null;

    let penaltyMsg = battleRank.penaltyReason
      ? `<div style="color:#e74c3c;font-size:.85rem;margin-top:6px;">Penalty: ${battleRank.penaltyReason}</div>`
      : '';

    summaryEl.innerHTML = `
      ${rankChangeHtml}
      <h3>${battleRank.icon} ${battleRank.title} • Score: ${battleRank.score}/100</h3>
      <div class="stats-grid">
        <div>Moves<br><strong>${this.app.playerMoves}</strong></div>
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
          <strong>${idx + 1}.</strong> ${whitePlayer} (${whiteRating}) — ${blackPlayer} (${blackRating})${year ? `, ${year}` : ''}<br>
          <span style="color:${resultColor};">${resultText}</span> • <a href="${gameUrl}" target="_blank">View ↗</a>
        </div>`;
      });
    } else {
      html += '<em style="color:#888;">No games found.</em>';
    }
    msgEl.innerHTML = html;
    msgEl.style.display = 'block';
  }
}