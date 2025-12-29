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
      <p class="menu-subtitle">Select your position in the line of battle.</p>

      <div style="display:flex; gap:12px; justify-content:center; margin:20px 0;">
        <button id="whiteBtn" class="menu-btn primary">Command White</button>
        <button id="blackBtn" class="menu-btn primary">Command Black</button>
      </div>

      <div class="battle-laws-brief"
        style="margin-top:20px; padding:12px; background:rgba(0,0,0,0.5);
               border:1px solid #333; border-radius:4px; text-align:left;">

        <h3 style="color:var(--gold); font-family:'Cinzel', serif;
                   font-size:1.2rem; margin-bottom:8px;
                   border-bottom:1px solid #444;">
          📜 BATTLE LAWS
        </h3>

        <p style="font-size:0.8rem; line-height:1.4; color:#bbb; margin:0;">
          <strong style="color:var(--gold);">Stay within opening theory to earn honor.</strong>
          Leave the book early, and the battle ends — judgment is final at that moment.
          Merit is decided by how long you hold the line, the accuracy of your moves,
          and the strength of the resulting position.
        </p>
<p style="font-size:0.8rem; line-height:1.4; color:#bbb; margin:0;">
  <strong style="color:var(--gold);">Stay within opening theory to earn honor.</strong>
  Leave the book early, and the battle ends — judgment is final at that moment.
  Merit is decided by how long you hold the line, the accuracy of your moves,
  and the strength of the resulting position.
  Based on this, your battle rank is assigned from these battle ranks: <strong>Levy, Hastatus, Principes, Triarius, or Imperator</strong>,
  where <em>Levy</em> reflects the weakest performance and <em>Imperator</em> the topmost.
  Merits earned in the battle are added to your total to move up the rank for promotion.
  In case of poor performance, your rank may be reduced.
  For example, three <em>Levy</em> performances in the last five battles will demote your rank from <strong>Legionary → Recruit</strong> and reset your merit.
</p>

        <p style="font-size:0.8rem; line-height:1.4; color:#bbb; margin-top:6px;">
          Consistent excellence earns promotion, but each new rank demands higher standards.
          <strong style="color:var(--gold);">Weak play, careless exits, and repeated failure bring demotion.</strong>
          Flee too early, and history will remember you as one who ran from the battlefield.
        </p>

        <!-- RANK MERIT REFERENCE -->
        <div style="margin-top:12px; padding:8px; background:rgba(0,0,0,0.45);
                    border:1px solid #333; border-radius:4px;">
          <h4 style="color:var(--gold); font-family:'Cinzel', serif;
                     font-size:0.75rem; margin-bottom:6px;
                     border-bottom:1px solid #444;">
            🏛️ RANK MERIT REFERENCE
          </h4>

          <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">🌱 Recruit</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">0 Merit</td>
            </tr>
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">🛡️ Legionary</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">100 Merit</td>
            </tr>
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">⚔️ Optio</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">250 Merit</td>
            </tr>
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">🦅 Centurion</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">500 Merit</td>
            </tr>
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">🏅 Tribunus</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">900 Merit</td>
            </tr>
            <tr>
              <td style="padding:6px 8px; color:var(--gold);">🏆 Legatus</td>
              <td style="padding:6px 8px; color:#bbb; text-align:right;">1500 Merit</td>
            </tr>
          </table>
        </div>
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