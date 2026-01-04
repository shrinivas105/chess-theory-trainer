// ui-renderer.js - Handles all UI rendering logic
// UPDATED: Simplified home page, rules section, white/maroon board, home button

class UIRenderer {
  constructor(app) {
    this.app = app;
  }

  renderBattleHistory(source) {
    const meritKey = `${source}_merit`;
    const currentMerit = this.app.legionMerits[meritKey] || 0;
    const legionInfo = Scoring.getLegionRank(currentMerit);
    const recentRanks = this.app.getRecentBattleRanks(source);
    const warning = Scoring.getDemotionWarning(legionInfo.title, recentRanks, currentMerit);

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
                  <tr><td>Legionary</td><td>2 Levy battles</td><td>Recruit (or reset to 200)</td></tr>
                  <tr><td>Optio</td><td>2 Levy or 2 Hastatus or (1 Levy + 1 Hastatus)</td><td>Legionary (or reset to 500)</td></tr>
                  <tr><td>Centurion</td><td>ANY Levy or Hastatus OR no Triarius/Imperator in 5 battles</td><td>Optio (or reset to 900)</td></tr>
                  <tr><td>Tribunus</td><td>ANY Levy or Hastatus OR less than 3 Triarius/Imperator</td><td>Centurion (or reset to 1300)</td></tr>
                  <tr><td>Legatus</td><td>N/A</td><td>N/A</td></tr>
                </tbody>
              </table>
              <div style="margin-top:8px; padding:6px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px; font-size:0.65rem; color:#f1c40f;">
                <strong>Safety Net:</strong> If you reach 50% progress in your rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.
              </div>
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
    
    const masterSafetyNet = Scoring.getSafetyNetThreshold(masterLegion.title);
    const clubSafetyNet = Scoring.getSafetyNetThreshold(clubLegion.title);
    
    document.getElementById('app').innerHTML = `
      <div class="menu">
        <h1 class="menu-title">LINES OF THE LEGION</h1>
        <p class="menu-subtitle">
         Master opening theory through Roman military ranks
        </p>
        
        ${authSection}
        
        <div class="menu-home">
          <!-- CAMPAIGNS SECTION -->
          <div class="menu-campaigns">
            <h3 style="color: var(--roman-gold); font-size: 0.9rem; margin-bottom: 10px; text-align: center;">Choose Your Campaign</h3>
            
            <button id="masterBtn" class="menu-btn" style="background: linear-gradient(135deg, var(--roman-gold) 0%, #b8941f 100%); box-shadow: 0 6px 0 #8b6f1a, 0 8px 15px rgba(212,175,55,0.4); border-color: rgba(212,175,55,0.3);">
              🏆 Master Campaign
            </button>
            
            <button id="lichessBtn" class="menu-btn" style="background: linear-gradient(135deg, var(--roman-silver) 0%, #a0a0a0 100%); box-shadow: 0 6px 0 #808080, 0 8px 15px rgba(192,192,192,0.4); border-color: rgba(192,192,192,0.3); color: #000; font-weight: 800;">
              ♟️ Club Campaign
            </button>
            
            <button id="resetBtn" class="menu-btn" style="background: transparent; border: 2px dashed #555; color: #888; box-shadow: none; font-size: 0.75rem; padding: 8px;">
              ↺ Reset Progress
            </button>
          </div>
          
          <!-- RULES SECTION -->
          <div class="menu-rules">
            <button class="rules-toggle" id="rulesToggle">
              <span>📜 GAME RULES</span>
              <span id="rulesArrow">▼</span>
            </button>
            
            <div id="rulesContent" style="display: none;" class="rules-content">
              <p style="margin-bottom: 10px;">
                Your ultimate aim is to earn 1,750 Merit and ascend to <strong style="color:var(--gold);">Legatus</strong> — the highest rank of the Roman army.
              </p>
              
              <h4>1. THE BATTLE</h4>
              <ul>
                <li><strong>Masters Mode:</strong> Elite games. The battle ends if the resulting position has fewer than 5 games in history.</li>
                <li><strong>Club Mode:</strong> Club games. The battle ends if the resulting position has fewer than 20 games in history.</li>
                <li>One hint per battle (Top 5 moves)</li>
              </ul>

              <h4>2. MERIT SCORING</h4>
              <ul>
                <li>Number of moves played while staying within theory</li>
                <li>Quality of moves compared to top historical choices</li>
                <li>Final position evaluation when the battle ends</li>
              </ul>

              <h4>3. BATTLE RANKS</h4>
              <p>
                🪖 Levy (0–39) · 🛡️ Hastatus (40–54) · ⚔️ Principes (55–69)<br>
                🦅 Triarius (70–84) · 👑 Imperator (85–100)
              </p>

              <h4>4. LEGION RANKS</h4>
              <p>
                🌱 Recruit (0) → 🛡️ Legionary (200) → ⚔️ Optio (500)<br>
                🦅 Centurion (900) → 🏅 Tribunus (1300) → 🏆 Legatus (1750)
              </p>

              <h4>5. DEMOTION & DISCIPLINE</h4>
              <table>
                <thead>
                  <tr>
                    <th>Current Rank</th>
                    <th>Poor Performance<br>(Last 5 Battles)</th>
                    <th>Demoted To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Recruit</td>
                    <td style="color:#777;">N/A</td>
                    <td style="color:#777;">N/A</td>
                  </tr>
                  <tr>
                    <td>Legionary</td>
                    <td>2 Levy battles</td>
                    <td>Recruit (or reset to 200 if 350+ merit)</td>
                  </tr>
                  <tr>
                    <td>Optio</td>
                    <td>2 Levy OR<br>2 Hastatus OR<br>1 Levy + 1 Hastatus</td>
                    <td>Legionary (or reset to 500 if 700+ merit)</td>
                  </tr>
                  <tr>
                    <td>Centurion</td>
                    <td>ANY Levy/Hastatus OR<br>No Triarius/Imperator in 5 battles</td>
                    <td>Optio (or reset to 900 if 1100+ merit)</td>
                  </tr>
                  <tr>
                    <td>Tribunus</td>
                    <td>ANY Levy/Hastatus OR<br>Less than 3 Triarius/Imperator</td>
                    <td>Centurion (or reset to 1300 if 1525+ merit)</td>
                  </tr>
                  <tr>
                    <td>Legatus</td>
                    <td style="color:#777;">N/A</td>
                    <td style="color:#777;">N/A</td>
                  </tr>
                </tbody>
              </table>
              
              <h4>6. PROMOTION REQUIREMENTS</h4>
              <ul>
                <li><strong>Recruit → Legionary:</strong> 200 merit (no other requirements)</li>
                <li><strong>Legionary → Optio:</strong> 500 merit (avoid 2 Levy)</li>
                <li><strong>Optio → Centurion:</strong> 900 merit (avoid demotion triggers)</li>
                <li><strong>Centurion → Tribunus:</strong> 1300 merit + at least 1 Triarius/Imperator</li>
                <li><strong>Tribunus → Legatus:</strong> 1750 merit + at least 3 Triarius/Imperator</li>
              </ul>
              
              <h4>7. SAFETY NET (50% RULE)</h4>
              <p>
                If you reach 50% progress toward your next rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.<br>
                <strong>Safety Thresholds:</strong> Legionary (350), Optio (700), Centurion (1100), Tribunus (1525)
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('masterBtn').onclick = () => this.app.selectSource('master');
    document.getElementById('lichessBtn').onclick = () => this.app.selectSource('lichess');
    document.getElementById('resetBtn').onclick = () => this.app.resetStats();
    
    const rulesToggle = document.getElementById('rulesToggle');
    const rulesContent = document.getElementById('rulesContent');
    const rulesArrow = document.getElementById('rulesArrow');
    
    rulesToggle.onclick = () => {
      const isOpen = rulesContent.style.display === 'block';
      rulesContent.style.display = isOpen ? 'none' : 'block';
      rulesArrow.textContent = isOpen ? '▼' : '▲';
    };
  }

  renderColorChoice() {
    const masterMerit = this.app.legionMerits.master_merit || 0;
    const clubMerit = this.app.legionMerits.lichess_merit || 0;
    const masterLegion = Scoring.getLegionRank(masterMerit);
    const clubLegion = Scoring.getLegionRank(clubMerit);
    const masterBattleHistory = this.renderBattleHistory('master');
    const clubBattleHistory = this.renderBattleHistory('lichess');
    const masterSafetyNet = Scoring.getSafetyNetThreshold(masterLegion.title);
    const clubSafetyNet = Scoring.getSafetyNetThreshold(clubLegion.title);
    
    const isMaster = this.app.aiSource === 'master';
    const currentMerit = isMaster ? masterMerit : clubMerit;
    const currentLegion = isMaster ? masterLegion : clubLegion;
    const currentBattleHistory = isMaster ? masterBattleHistory : clubBattleHistory;
    const currentSafetyNet = isMaster ? masterSafetyNet : clubSafetyNet;
    const gamesPlayed = isMaster ? this.app.gamesPlayedMaster : this.app.gamesPlayedLichess;
    
    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠 Home</button>
      
      <div class="menu">
        <h1 class="menu-title">LINES OF THE LEGION</h1>
        <p class="menu-subtitle">
          ${isMaster ? '🏆 Master Campaign' : '♟️ Club Campaign'}
        </p>

        <!-- Current Legion Status -->
        <div class="legion-card ${isMaster ? 'masters' : 'club'}">
          <div class="legion-header">${isMaster ? '🏆 Masters Legion' : '♟️ Club Legion'}</div>
          <div class="legion-status">
            ${currentLegion.title} (${currentMerit} merit) ${currentLegion.icon}
          </div>
          ${currentLegion.nextRank
            ? `<div class="legion-next">${currentLegion.title} → ${currentLegion.nextRank}: ${currentLegion.pointsNeeded} more</div>`
            : `<div class="legion-next">Highest rank achieved</div>`}
          ${currentSafetyNet ? `<div class="safety-net-display">🛡️ Demotion Safety Net: ${currentSafetyNet} merit</div>` : ''}
          <div class="rank-progress">
            ${currentLegion.rankOrder.map(r =>
              `<div class="rank-step ${r === currentLegion.title ? 'active' : ''}">${r}</div>`
            ).join('')}
          </div>
          ${currentBattleHistory}
          <div style="font-size:0.75rem;color:#aaa;margin-top:4px;text-align:center;">
            Battles Fought: ${gamesPlayed}
          </div>
        </div>

        <p style="text-align:center;margin:15px 0;color:var(--parchment);font-size:0.85rem;">
          Select your position in the line of battle
        </p>

        <div style="display:flex; gap:12px; justify-content:center; margin:20px 0;">
          <button id="whiteBtn" class="menu-btn" style="width: auto; padding: 12px 24px;">Command White</button>
          <button id="blackBtn" class="menu-btn" style="width: auto; padding: 12px 24px;">Command Black</button>
        </div>
      </div>
    `;

    document.getElementById('whiteBtn').onclick = () => this.app.selectColor('w');
    document.getElementById('blackBtn').onclick = () => this.app.selectColor('b');
  }

  renderGameContainer() {
    if (document.querySelector('.game-container')) return;
    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠 Home</button>
      
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

    const rankColors = {
      'Levy': '#2ecc71',
      'Hastatus': '#ecf0f1',
      'Principes': '#e74c3c',
      'Triarius': '#3498db',
      'Imperator': '#9b59b6'
    };
    const rankColor = rankColors[battleRank.title] || '#d4af37';

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
      
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <button id="showAnalysisBtn" class="btn">
          📊 Analyze
        </button>
        <button id="downloadPGNBtn" class="btn">
          📥 PGN
        </button>
        <button id="copyPGNBtn" class="btn">
          📋 Copy
        </button>
      </div>
    `;
    summaryEl.style.display = 'block';

    setTimeout(() => {
      const analysisBtn = document.getElementById('showAnalysisBtn');
      const downloadBtn = document.getElementById('downloadPGNBtn');
      const copyBtn = document.getElementById('copyPGNBtn');
      
      if (analysisBtn) {
        analysisBtn.onclick = () => this.app.showAnalysis();
      }
      
      if (downloadBtn) {
        downloadBtn.onclick = () => this.app.downloadPGN();
      }
      
      if (copyBtn) {
        copyBtn.onclick = () => this.app.copyPGN();
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
  }
}