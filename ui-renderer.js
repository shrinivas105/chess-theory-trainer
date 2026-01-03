// ui-renderer.js - Handles all UI rendering logic
// UPDATED: New merit thresholds and demotion warning system

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
        <div class="battle-history-title">
          Last ${recentRanks.length} Battle${recentRanks.length > 1 ? 's' : ''}
        </div>

        <!-- ROW wrapper -->
        <div class="battle-history-row">
          <div class="battle-badges">
            ${battleBadges}
          </div>

          <div class="tooltip-container">
            <div class="tooltip-icon">?</div>
            <div class="tooltip-content">
              <div class="tooltip-title">Demotion Rules</div>
              <table class="demotion-table">
                <thead>
                  <tr>
                    <th>Current Rank</th>
                    <th>Poor Performance (last 5 battles)</th>
                    <th>Demote To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Recruit</td><td>N/A</td><td>N/A</td></tr>
                  <tr><td>Legionary</td><td>2 Levy battles</td><td>Recruit</td></tr>
                  <tr><td>Optio</td><td>2 Levy or 2 Hastatus or (1 Levy + 1 Hastatus)</td><td>Legionary</td></tr>
                  <tr><td>Centurion</td><td>ANY Levy or Hastatus OR no Triarius/Imperator in 5 battles</td><td>Optio</td></tr>
                  <tr><td>Tribunus</td><td>ANY Levy or Hastatus OR less than 3 Triarius/Imperator</td><td>Centurion</td></tr>
                  <tr><td>Legatus</td><td>N/A</td><td>N/A</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
         Survive within recorded battle, and rise through the ranks of the Roman army.
        </p>
        ${authSection}
        <div style="font-size:.9rem;line-height:1.5;">

    <!-- CLUB LEGION FIRST -->
    <div class="legion-card club">
      <div class="legion-header">♟️ Club Legion</div>
      <div class="legion-status">
        ${clubLegion.title} (${clubMerit} merit) ${clubLegion.icon}
      </div>
      ${clubLegion.nextRank
        ? `<div class="legion-next">${clubLegion.title} → ${clubLegion.nextRank}: ${clubLegion.pointsNeeded} more</div>`
        : `<div class="legion-next">Highest rank achieved</div>`}
      <div class="rank-progress">
        ${clubLegion.rankOrder.map(r =>
          `<div class="rank-step ${r === clubLegion.title ? 'active' : ''}">${r}</div>`
        ).join('')}
      </div>
      ${clubBattleHistory}
      <div style="font-size:0.8rem;color:#aaa;margin-top:4px;">
        Club Battles: ${this.app.gamesPlayedLichess}
      </div>
    </div>

    <!-- MASTERS LEGION SECOND -->
    <div class="legion-card masters">
      <div class="legion-header">🏆 Masters Legion</div>
      <div class="legion-status">
        ${masterLegion.title} (${masterMerit} merit) ${masterLegion.icon}
      </div>
      ${masterLegion.nextRank
        ? `<div class="legion-next">${masterLegion.title} → ${masterLegion.nextRank}: ${masterLegion.pointsNeeded} more</div>`
        : `<div class="legion-next">Highest rank achieved</div>`}
      <div class="rank-progress">
        ${masterLegion.rankOrder.map(r =>
          `<div class="rank-step ${r === masterLegion.title ? 'active' : ''}">${r}</div>`
        ).join('')}
      </div>
      ${masterBattleHistory}
      <div style="font-size:0.8rem;color:#aaa;margin-top:4px;">
        Master Battles: ${this.app.gamesPlayedMaster}
      </div>
    </div>

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
        <p class="menu-bwsection">Select your position in the line of battle.</p>

        <div style="display:flex; gap:12px; justify-content:center; margin:20px 0;">
          <button id="whiteBtn" class="menu-btn primary">Command White</button>
          <button id="blackBtn" class="menu-btn primary">Command Black</button>
        </div>

        <div class="battle-laws-brief"
          style="margin-top:16px; padding:12px; background:rgba(0,0,0,0.5);
                 border:1px solid #333; border-radius:4px; text-align:left;">

          <h3 style="color:var(--gold); font-family:'Cinzel', serif;
                     font-size:1.1rem; margin-bottom:8px;
                     border-bottom:1px solid #444;">
            📜 GAME RULES
          </h3>

   <p style="font-size:0.8rem; line-height:1.4; color:#bbb;">
    Your ultimate aim is to earn 1,750 Merit and ascend to <strong style="color:var(--gold);">Legatus</strong> — the highest rank of the Roman army.
  </p>
          <p style="font-size:0.8rem; line-height:1.4; color:#bbb; margin:0;">
            <strong style="color:var(--gold);">Stay within opening theory to earn honor.</strong>
            Leave the book early, and the battle ends — judgment is final at that moment.
            Merit is decided by how long you hold the line, the accuracy of your moves,
            and the strength of the resulting position.
            Based on this, your battle rank is assigned from these battle ranks:
            <strong>Levy, Hastatus, Principes, Triarius, or Imperator</strong>,
            where <em>Levy</em> reflects the weakest performance and
            <em>Imperator</em> the topmost.
            Merits earned in the battle are added to your total to move up the rank
            for promotion. In case of poor performance, your rank may be reduced.
            For example, two <em>Levy</em> performances in the last five battles
            will demote your rank from <strong>Legionary → Recruit</strong>
            and reset your merit.
            Consistent excellence earns promotion, but each new rank demands higher standards.
            <strong style="color:var(--gold);">
              Weak play, careless exits, and repeated failure bring demotion.
            </strong>
            Flee too early, and history will remember you as one who ran from the battlefield.
          </p>
           <p style="font-size:0.75rem; color:var(--gold); text-align:center;">
              All the best — reach the pinnacle of the Roman army.
            </p>
          <button id="toggleRules"
            style="margin-top:10px; background:none; border:none;
                   color:var(--gold); font-size:0.75rem; cursor:pointer;">
            ▶ View Full Rules
          </button>

          <!-- FULL RULES -->
          <div id="fullRules" style="display:none; margin-top:10px;
               padding-top:10px; border-top:1px solid #444;
               max-height:260px; overflow-y:auto;">

            <h4 style="color:var(--gold); font-family:'Cinzel', serif;
                       font-size:0.9rem; margin-bottom:6px;">
              📘 DETAILED RULES 
            </h4>
            <h4 style="margin-top:10px; color:var(--gold); font-size:0.8rem;">
              1. THE BATTLE
            </h4>
            <ul style="font-size:0.75rem; color:#bbb; padding-left:16px;">
              <li><strong>Masters Mode:</strong> Elite games. The battle ends if the resulting position has fewer than 5 games in history.</li>
              <li><strong>Club Mode:</strong> Club games. The battle ends if the resulting position has fewer than 20 games in history.</li>
              <li>One hint per battle (Top 5 moves)</li>
            </ul>

            <h4 style="margin-top:8px; color:var(--gold); font-size:0.8rem;">
              2. MERIT SCORING
            </h4>
            <ul style="font-size:0.75rem; color:#bbb; padding-left:16px;">
            <li>Number of moves played while staying within theory</li>
  <li>Quality of moves compared to top historical choices</li>
  <li>Final position evaluation when the battle ends</li>

            </ul>

            <h4 style="margin-top:8px; color:var(--gold); font-size:0.8rem;">
              3. BATTLE RANKS
            </h4>
            <p style="font-size:0.75rem; color:#bbb;">
              🪖 Levy (0–39) · 🛡️ Hastatus (40–54) · ⚔️ Principes (55–69)<br>
              🦅 Triarius (70–84) · 👑 Imperator (85–100)
            </p>

            <h4 style="margin-top:8px; color:var(--gold); font-size:0.8rem;">
              4. LEGION RANKS
            </h4>
            <p style="font-size:0.75rem; color:#bbb;">
              🌱 Recruit (0) → 🛡️ Legionary (200) → ⚔️ Optio (500)<br>
              🦅 Centurion (900) → 🏅 Tribunus (1300) → 🏆 Legatus (1750)
            </p>

            <h4 style="margin-top:8px; color:var(--gold); font-size:0.8rem;">
              5. DEMOTION & DISCIPLINE
            </h4>
            <table style="width:100%; border-collapse:collapse; font-size:0.72rem;
                          background:rgba(0,0,0,0.35); border:1px solid #333;">
              <thead>
                <tr style="background:rgba(0,0,0,0.55);">
                  <th style="padding:6px; border:1px solid #333; color:var(--gold); text-align:left;">
                    Current Rank
                  </th>
                  <th style="padding:6px; border:1px solid #333; color:var(--gold); text-align:left;">
                    Poor Performance<br>(Last 5 Battles)
                  </th>
                  <th style="padding:6px; border:1px solid #333; color:var(--gold); text-align:left;">
                    Demoted To
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Recruit</td>
                  <td style="padding:6px; border:1px solid #333; color:#777;">N/A</td>
                  <td style="padding:6px; border:1px solid #333; color:#777;">N/A</td>
                </tr>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Legionary</td>
                  <td style="padding:6px; border:1px solid #333;">2 Levy battles</td>
                  <td style="padding:6px; border:1px solid #333;">Recruit</td>
                </tr>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Optio</td>
                  <td style="padding:6px; border:1px solid #333;">
                    2 Levy OR<br>2 Hastatus OR<br>1 Levy + 1 Hastatus
                  </td>
                  <td style="padding:6px; border:1px solid #333;">Legionary</td>
                </tr>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Centurion</td>
                  <td style="padding:6px; border:1px solid #333;">
                    ANY Levy/Hastatus OR<br>No Triarius/Imperator in 5 battles
                  </td>
                  <td style="padding:6px; border:1px solid #333;">Optio</td>
                </tr>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Tribunus</td>
                  <td style="padding:6px; border:1px solid #333;">
                    ANY Levy/Hastatus OR<br>Less than 3 Triarius/Imperator
                  </td>
                  <td style="padding:6px; border:1px solid #333;">Centurion</td>
                </tr>
                <tr>
                  <td style="padding:6px; border:1px solid #333;">Legatus</td>
                  <td style="padding:6px; border:1px solid #333; color:#777;">N/A</td>
                  <td style="padding:6px; border:1px solid #333; color:#777;">N/A</td>
                </tr>
              </tbody>
            </table>
            
            <h4 style="margin-top:8px; color:var(--gold); font-size:0.8rem;">
              6. PROMOTION REQUIREMENTS
            </h4>
            <ul style="font-size:0.75rem; color:#bbb; padding-left:16px;">
              <li><strong>Recruit → Legionary:</strong> 200 merit (no other requirements)</li>
              <li><strong>Legionary → Optio:</strong> 500 merit (avoid 2 Levy)</li>
              <li><strong>Optio → Centurion:</strong> 900 merit (avoid demotion triggers)</li>
              <li><strong>Centurion → Tribunus:</strong> 1300 merit + at least 1 Triarius/Imperator</li>
              <li><strong>Tribunus → Legatus:</strong> 1750 merit + at least 3 Triarius/Imperator</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    document.getElementById('whiteBtn').onclick = () => this.app.selectColor('w');
    document.getElementById('blackBtn').onclick = () => this.app.selectColor('b');

    const toggle = document.getElementById('toggleRules');
    const full = document.getElementById('fullRules');

    toggle.onclick = () => {
      const open = full.style.display === 'block';
      full.style.display = open ? 'none' : 'block';
      toggle.textContent = open ? '▶ View Full Rules' : '▼ Hide Full Rules';
    };
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
    console.log('📊 Rendering end game summary...');
    
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

    // Get rank-specific color based on Roman customs
    const rankColors = {
      'Levy': '#2ecc71',
      'Hastatus': '#ecf0f1',
      'Principes': '#e74c3c',
      'Triarius': '#3498db',
      'Imperator': '#9b59b6'
    };
    const rankColor = rankColors[battleRank.title] || '#d4af37';
    const textColor = battleRank.title === 'Hastatus' ? '#000' : '#fff';

    summaryEl.innerHTML = `
      ${rankChangeHtml}
      <h3 style="color: ${rankColor}; text-shadow: 0 0 20px ${rankColor};">${battleRank.icon} ${battleRank.title} • Score: ${battleRank.score}/100</h3>
      <div class="stats-grid">
        <div>Moves<br><strong>${this.app.playerMoves}</strong></div>
        <div>Quality<br><strong>${moveQuality}%</strong></div>
        <div>Eval<br><strong>${displayEval}</strong></div>
      </div>
      <div style="font-style:italic;color:#bbb;margin:8px 0;">"${battleRank.msg}"</div>
      <div style="font-size:.85rem;color:#aaa;"><em>${battleRank.sub}</em></div>
      <div class="rank-progress">
        ${['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'].map(r => {
          const color = rankColors[r];
          const isActive = r === battleRank.title;
          return `<div class="rank-step ${isActive ? 'active' : ''}" style="${isActive ? `background: linear-gradient(135deg, ${color}, ${color}); color: ${r === 'Hastatus' ? '#000' : '#fff'}; border-color: ${color};` : ''}">${r}</div>`;
        }).join('')}
      </div>
      ${penaltyMsg}
      
      <!-- Action Buttons -->
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <button id="showAnalysisBtn" class="btn" style="background:#9b59b6; padding:8px 16px; font-size:0.9rem;">
          📊 Analyze
        </button>
        <button id="downloadPGNBtn" class="btn" style="background:#2ecc71; padding:8px 16px; font-size:0.9rem;">
          📥 PGN
        </button>
        <button id="copyPGNBtn" class="btn" style="background:#3498db; padding:8px 16px; font-size:0.9rem;">
          📋 Copy
        </button>
      </div>
    `;
    summaryEl.style.display = 'block';

    // Attach event listeners with delay and error handling
    setTimeout(() => {
      const analysisBtn = document.getElementById('showAnalysisBtn');
      const downloadBtn = document.getElementById('downloadPGNBtn');
      const copyBtn = document.getElementById('copyPGNBtn');
      
      if (analysisBtn) {
        console.log('✅ Analysis button found, attaching click handler');
        analysisBtn.onclick = () => {
          console.log('🔍 Analysis button clicked!');
          this.app.showAnalysis();
        };
      } else {
        console.error('❌ Analysis button not found!');
      }
      
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          console.log('📥 Download PGN clicked');
          this.app.downloadPGN();
        };
      }
      
      if (copyBtn) {
        copyBtn.onclick = () => {
          console.log('📋 Copy PGN clicked');
          this.app.copyPGN();
        };
      }
    }, 100);

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
    
    console.log('✅ End game summary rendered successfully');
  }
}