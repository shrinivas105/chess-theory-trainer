// ui-renderer.js - Handles all UI rendering logic
// UPDATED: Fixed auth section to be positioned fixed at top right

// ──────────────────────────────────────────────
// DONATION CONFIG
// Replace with your PayPal.me link.
// PayPal accepts USD (and all major currencies)
// and converts to INR on payout to your bank.
// ──────────────────────────────────────────────
const DONATION_PAYPAL = 'https://paypal.me/yourhandle'; // ← replace this

// ──────────────────────────────────────────────
// SUPPORTERS LIST — add donors here manually.
// Only add someone if they've given permission.
// Each entry: { name, country }
//   name    → displayed as-is
//   country → two-letter ISO code (used for flag emoji)
//             e.g. 'IN' = India, 'US' = USA, 'GB' = UK
// ──────────────────────────────────────────────
const SUPPORTERS = [
  // { name: 'Arjun',   country: 'IN' },
  // { name: 'Sarah',   country: 'US' },
  // { name: 'Marcus',  country: 'DE' },
];

class UIRenderer {
  constructor(app) {
    this.app = app;
  }

  // Converts a 2-letter ISO country code to a flag emoji.
  // Falls back to the raw code in brackets if the emoji
  // doesn't render (e.g. some Windows builds).
  toFlag(code) {
    try {
      return code.toUpperCase().split('').map(
        c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
      ).join('');
    } catch {
      return `[${code.toUpperCase()}]`;
    }
  }

  // Single PayPal donation button.
  renderDonateButtons() {
    return `
      <div class="donate-wrap">
        <a href="${DONATION_PAYPAL}" target="_blank" rel="noopener noreferrer"
           class="coffee-btn coffee-btn--primary"
           style="color:#ffffff !important; text-decoration:none !important; font-size:0.85rem;">
          ☕ Enjoyed this game ? Leave a tip using Paypal
        </a>
      </div>
    `;
  }

  // Renders the supporters list HTML.
  // Returns empty string when the array is empty
  // so the toggle doesn't appear at all until there's
  // at least one supporter.
  renderSupporters() {
    if (SUPPORTERS.length === 0) return '';

    const list = SUPPORTERS.map(s =>
      `<div class="supporter-item">
        <span class="supporter-flag">${this.toFlag(s.country)}</span>
        <span class="supporter-name">${s.name}</span>
      </div>`
    ).join('');

    return `
      <button class="credits-toggle" id="supportersToggle">
        <span>🙏 Supporters</span>
        <span id="supportersArrow">▼</span>
      </button>
      <div id="supportersContent" class="supporters-content" style="display:none;">
        <div class="supporters-list">${list}</div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────
  // Shared footer: donation button + credits.
  // Called by renderMenu() and renderEndGameSummary().
  // ──────────────────────────────────────────────
  renderFooter() {
    return `
      <div class="footer-section">
        ${this.renderDonateButtons()}
        ${this.renderSupporters()}
        <button class="credits-toggle" id="creditsToggle">
          <span>about</span>
          <span id="creditsArrow">▼</span>
        </button>
        <div id="creditsContent" class="credits-content" style="display:none;">
          <p class="footer-note">
            This is a completely free application — no subscriptions, no paywalls.<br>
            If you enjoy it, support me via PayPal above or reach out at
            <a href="mailto:linesofthelegion@gmail.com">linesofthelegion@gmail.com</a><br>
            Thanks to <a href="https://lichess.org" target="_blank" rel="noopener noreferrer">Lichess</a>
            and <a href="https://chess-api.com" target="_blank" rel="noopener noreferrer">Chess-API</a> for their free APIs.
          </p>
        </div>
      </div>
    `;
  }

  // Wires up the credits and supporters toggles after footer HTML is in the DOM.
  bindFooter() {
    const creditsToggle  = document.getElementById('creditsToggle');
    const creditsContent = document.getElementById('creditsContent');
    const creditsArrow   = document.getElementById('creditsArrow');
    if (creditsToggle) {
      creditsToggle.onclick = () => {
        const open = creditsContent.style.display === 'block';
        creditsContent.style.display = open ? 'none' : 'block';
        creditsArrow.textContent = open ? '▼' : '▲';
      };
    }

    const suppToggle  = document.getElementById('supportersToggle');
    const suppContent = document.getElementById('supportersContent');
    const suppArrow   = document.getElementById('supportersArrow');
    if (suppToggle) {
      suppToggle.onclick = () => {
        const open = suppContent.style.display === 'block';
        suppContent.style.display = open ? 'none' : 'block';
        suppArrow.textContent = open ? '▼' : '▲';
      };
    }
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
    
    const masterSafetyNet = Scoring.getSafetyNetThreshold(masterLegion.title);
    const clubSafetyNet = Scoring.getSafetyNetThreshold(clubLegion.title);
    
    document.getElementById('app').innerHTML = `
      <div class="menu">
        <h1 class="menu-title">LINES OF THE LEGION</h1>
        <p class="menu-subtitle">
         Master opening theory through Roman military ranks
        </p>
        
        <div class="game-description">
          <p>
            Enter the battlefield where chess mastery meets Roman military glory. Every move you make is judged against 
            the greatest games in history. Will you rise through the ranks from humble <strong>Recruit</strong> to legendary 
            <strong>Legatus</strong>?
          </p>
          <p>
            Each battle tests your knowledge of opening theory. Play moves that match the masters, maintain strong positions, 
            and prove your tactical prowess. Earn merit through discipline and excellence, but beware—poor performance leads 
            to demotion and disgrace.
          </p>
          <p>
            Choose your campaign and step onto the field of glory. <em>Veni, vidi, vici!</em>
          </p>
        </div>
        
        <div class="menu-home">
          <!-- CAMPAIGNS SECTION -->
          <div class="menu-campaigns">
            <h3 style="color: var(--roman-gold); font-size: 0.9rem; margin-bottom: 10px; text-align: center;">Choose Your Campaign</h3>
            
           <button id="masterBtn" class="menu-btn campaign-btn" style="background: linear-gradient(135deg, var(--roman-gold) 0%, #b8941f 100%); box-shadow: 0 4px 0 #8b6f1a, 0 5px 10px rgba(212,175,55,0.4); border-color: rgba(212,175,55,0.3);">
  <span class="campaign-btn-icon">🏆</span>
  <span class="campaign-btn-label">Master Campaign</span>
</button>
            
     <button id="lichessBtn" class="menu-btn campaign-btn" style="background: linear-gradient(135deg, var(--roman-silver) 0%, #a0a0a0 100%); box-shadow: 0 4px 0 #808080, 0 5px 10px rgba(192,192,192,0.4); border-color: rgba(192,192,192,0.3); color: #000; font-weight: 800;">
  <span class="campaign-btn-icon">♟️</span>
  <span class="campaign-btn-label">Club Campaign</span>
</button>

     <button id="practiceBtn" class="menu-btn campaign-btn" style="background: linear-gradient(135deg, #4a90e2 0%, #2a6fb8 100%); box-shadow: 0 4px 0 #1f4f82, 0 5px 10px rgba(46, 134, 193, 0.4); border-color: rgba(69, 121, 191, 0.3); color: #fff;">
  <span class="campaign-btn-icon">📖</span>
  <span class="campaign-btn-label">Practice</span>
</button>
            
           <button id="resetBtn" class="menu-btn" style="background: transparent; border: 2px dashed #555; color: #888; box-shadow: none; font-size: 0.65rem; padding: 6px;">
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
                Your ultimate aim is to earn 1,750 Merit and ascend to <strong style="color:var(--gold);">Legatus</strong> – the highest rank of the Roman army.
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

        ${this.renderFooter()}
      </div>
    `;
    
    // Render auth section as fixed element
    this.renderAuthSection();
    this.bindFooter();
   // document.getElementById('masterBtn').onclick = () => this.app.selectSource('master');
    //document.getElementById('lichessBtn').onclick = () => this.app.selectSource('lichess');
	document.getElementById('masterBtn').onclick = () => {
      if (typeof RomanBattleEffects !== 'undefined') RomanBattleEffects.playMenuFanfare();
      this.app.selectSource('master');
    };

    document.getElementById('lichessBtn').onclick = () => {
      if (typeof RomanBattleEffects !== 'undefined') RomanBattleEffects.playMenuFanfare();
      this.app.selectSource('lichess');
    };

    document.getElementById('practiceBtn').onclick = () => {
      this.app.startPracticePicker();
    };

    
    const rulesToggle = document.getElementById('rulesToggle');
    const rulesContent = document.getElementById('rulesContent');
    const rulesArrow = document.getElementById('rulesArrow');
    
    rulesToggle.onclick = () => {
      const isOpen = rulesContent.style.display === 'block';
      rulesContent.style.display = isOpen ? 'none' : 'block';
      rulesArrow.textContent = isOpen ? '▼' : '▲';
    };
  }

  renderPracticePicker() {
    const grouped = PracticeOpenings.reduce((acc, opening, index) => {
      const group = opening.orientation === 'black' ? 'Black Defense' : 'White Opening';
      if (!acc[group]) acc[group] = [];
      acc[group].push({ ...opening, index });
      return acc;
    }, {});

    const order = ['White Opening', 'Black Defense'];
    const sections = order.map(group => {
      const rows = (grouped[group] || []).map(opening => `
        <tr class="practice-opening-row" onclick="app.startPracticeOpening(PracticeOpenings[${opening.index}])">
          <td class="practice-opening-name">${opening.name}</td>
          <td class="practice-opening-side">${opening.orientation === 'white' ? 'White' : 'Black'}</td>
        </tr>
      `).join('');

      if (!rows) return '';
      return `
        <div class="practice-category practice-category--${group.toLowerCase().replace(/\s+/g, '-')}">
          <h3>${group}</h3>
          <table class="practice-table">
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const isLoading = !PracticeOpeningsManager.isLoaded;
    const emptyMessage = isLoading
      ? 'Loading practice openings…'
      : (PracticeOpenings.length === 0 ? 'No practice lines loaded yet. Add one or upload a CSV.' : '');

    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠</button>
      <div class="menu">
        <h1 class="menu-title">Practice Mode</h1>
        <p class="menu-subtitle">Pick an opening and drill the position from a real-game opening book.</p>

        <div class="practice-message">${emptyMessage}</div>

        ${isLoading ? '' : sections}

        <div class="practice-toolbar practice-toolbar--bottom">
          <button id="practiceAddBtn" class="menu-btn">+ Add Practice Line</button>
          <button id="practiceUploadBtn" class="menu-btn">📂 Upload CSV</button>
          <button id="practiceDownloadBtn" class="menu-btn">💾 Download CSV</button>
        </div>

        <input id="practiceOpeningsUploadInput" type="file" accept=".csv" style="display:none;" />

        <div id="practiceAddModal" class="practice-modal-backdrop" style="display:none;">
          <div class="practice-modal">
            <h2>Add Practice Line</h2>
            <p class="practice-helper">Enter the FEN and choose the orientation for the opening.</p>
            <label for="practiceAddName">Name</label>
            <input id="practiceAddName" type="text" placeholder="Example: Queen's Gambit Declined" />
            <label for="practiceAddFen">FEN</label>
            <input id="practiceAddFen" type="text" placeholder="Example: rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/4PN2/PPP2PPP/RN1QKB1R b KQkq - 1 4" />
            <label>Orientation</label>
            <div class="practice-radio-group">
              <label><input type="radio" name="practiceAddOrientation" value="white" checked /> White</label>
              <label><input type="radio" name="practiceAddOrientation" value="black" /> Black</label>
            </div>
            <div class="practice-actions">
              <button id="practiceAddCancelBtn" class="menu-btn">Cancel</button>
              <button id="practiceAddSaveBtn" class="menu-btn">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderAuthSection();
    PracticeOpeningsManager.bindPracticePicker();
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
    
    // Calculate progress to next rank
    const currentLevel = currentLegion.level || 0;
    const currentThreshold = currentLegion.thresholds ? currentLegion.thresholds[currentLevel] : 0;
    const nextThreshold = currentLegion.thresholds && currentLevel < currentLegion.rankOrder.length - 1
      ? currentLegion.thresholds[currentLevel + 1]
      : currentThreshold;
    const progressInSegment = currentThreshold === nextThreshold
      ? 100
      : Math.round(((currentMerit - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
    const clampedProgress = Math.min(100, Math.max(0, progressInSegment));
    
    // Generate progress path visualization with medal images
    const rankImageMap = {
      'Recruit': 'recruit.jpg',
      'Legionary': 'Legionary.jpg',
      'Optio': 'optio.jpg',
      'Centurion': 'centurion.jpg',
      'Tribunus': 'trbunus.jpg',
      'Legatus': 'legatus.jpg'
    };
    
    const pathSteps = currentLegion.rankOrder.map((rank, i) => {
      const isReached = i <= currentLevel;
      const isCurrent = i === currentLevel;
      const threshold = currentLegion.thresholds ? currentLegion.thresholds[i] : 0;
      const imageSrc = rankImageMap[rank] || '';
      return `
        <div class="legion-path-step ${isReached ? 'legion-path-step--reached' : ''} ${isCurrent ? 'legion-path-step--current' : ''}">
          <div class="legion-path-node">
            ${imageSrc ? `<img src="${imageSrc}" alt="${rank}" class="legion-path-medal" onerror="this.style.display='none'; this.parentElement.innerHTML='${rank.substring(0,1)}';"/>` : rank.substring(0, 1)}
          </div>
          <div class="legion-path-label">${rank}</div>
          <div class="legion-path-merit">${threshold}</div>
        </div>
      `;
    }).join('');
    
    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠</button>
      
      <div class="menu">
        <!-- Current Legion Status -->
        <div class="legion-card ${isMaster ? 'masters' : 'club'}">
          <div class="legion-header">${isMaster ? '🏆 Masters Legion' : '♟️ Club Legion'}</div>
          <div class="legion-status">
            ${currentLegion.title} (${currentMerit} merit) ${currentLegion.icon}
          </div>
          
          <!-- Road to Legatus Progress -->
          <div style="margin: 8px 0;">
            <div style="font-size: 0.8rem; font-weight: bold; color: var(--roman-gold); margin-bottom: 8px; text-align: center;">Road to Legatus</div>
            
            <!-- Progress Path -->
            <div class="legion-path">
              ${pathSteps}
            </div>
            
            <!-- Progress Bar to Next Rank -->
            ${currentLegion.nextRank ? `
              <div style="margin-top: 10px;">
                <div style="font-size: 0.7rem; color: #aaa; margin-bottom: 4px; text-align: center;">
                  ${currentLegion.title} → ${currentLegion.nextRank}
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 10px; overflow: hidden; border: 1px solid var(--roman-gold);">
                  <div style="background: linear-gradient(90deg, var(--roman-gold), #d4af37); height: 100%; width: ${clampedProgress}%; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 0.65rem; color: #aaa; margin-top: 3px; text-align: center;">
                  ${currentMerit} / ${nextThreshold} merit (${clampedProgress}%)
                </div>
              </div>
            ` : `
              <div style="font-size: 0.7rem; color: var(--roman-gold); text-align: center; margin-top: 6px; font-weight: bold;">✨ Highest rank achieved ✨</div>
            `}
          </div>
          
          ${currentSafetyNet ? `<div class="safety-net-display">🛡️ Demotion Safety Net: ${currentSafetyNet} merit</div>` : ''}
          ${currentBattleHistory}
          <div style="font-size:0.7rem;color:#aaa;margin-top:2px;text-align:center;">
            Battles Fought: ${gamesPlayed}
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:center; margin:8px 0;">
          <button id="startBattleBtn" class="menu-btn" style="width: auto; padding: 10px 20px; font-size: 0.85rem;">⚔️ Start Battle</button>
        </div>
      </div>
    `;

    // Render auth section as fixed element
    this.renderAuthSection();

    document.getElementById('startBattleBtn').onclick = () => this.app.startBattle();
  }

  renderGameContainer() {
  // Only create if it doesn't exist
  if (document.querySelector('.game-container')) {
    return;
  }
  
  console.log('Creating game container');
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
  this.renderAuthSection();
  
}

  renderAuthSection() {
    // Remove any existing auth section
    const existingAuth = document.querySelector('.auth-section-fixed');
    if (existingAuth) {
      existingAuth.remove();
    }
    
    // Create new auth section
    const authHtml = this.app.auth.renderAuthSection();
    const authDiv = document.createElement('div');
    authDiv.className = 'auth-section-fixed';
    authDiv.innerHTML = authHtml;

    // Lichess connect button (needed for explorer API auth)
    const lichessDiv = document.createElement('div');
    lichessDiv.id = 'lichess-auth-btn';
    authDiv.appendChild(lichessDiv);

    document.body.appendChild(authDiv);

    // Render button content after it's in the DOM
    if (typeof LichessAuth !== 'undefined') {
      LichessAuth.renderButton('lichess-auth-btn');
    }
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
        : 'Position data unavailable – continuing...';
    }

    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
      const hintEnabled = this.app.mode === 'practice'
        ? !this.app.hintUsed
        : isPlayerTurn && !this.app.hintUsed;
      hintBtn.disabled = !hintEnabled;
      hintBtn.textContent = this.app.hintUsed ? '✓ Consulted' : '🎖️ Consult Commander';
      hintBtn.onclick = hintEnabled ? () => this.app.getHints() : null;
    }

    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const legalTargets = this.app.selected
      ? new Set(this.app.game.moves({ square: this.app.selected, verbose: true }).map(m => m.to))
      : new Set();

    renderedBoard.forEach((row, r) => {
      row.forEach((square, c) => {
        const actualRow = isFlipped ? 7 - r : r;
        const actualCol = isFlipped ? 7 - c : c;
        const sqName = 'abcdefgh'[actualCol] + (8 - actualRow);
        const isLight = (actualRow + actualCol) % 2 === 0;
        const isSelected = this.app.selected === sqName;
        const isLastMove = this.app.lastMove.from === sqName || this.app.lastMove.to === sqName;
        const isMoveTarget = legalTargets.has(sqName);

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${isMoveTarget ? 'move-target' : ''} ${!isPlayerTurn ? 'disabled' : ''}`;
        div.onclick = () => this.app.handleClick(actualRow, actualCol);
        div.onmousedown = e => e.preventDefault();
        div.ondragover = e => {
          if (isPlayerTurn && this.app.dragSource) {
            e.preventDefault();
          }
        };
        div.ondragenter = e => {
          if (isPlayerTurn && this.app.dragSource) {
            e.preventDefault();
            div.classList.add('drag-over');
          }
        };
        div.ondragleave = () => {
          div.classList.remove('drag-over');
        };
        div.ondrop = e => {
          if (!isPlayerTurn || !this.app.dragSource) return;
          e.preventDefault();
          div.classList.remove('drag-over');
          const source = this.app.dragSource;
          this.app.handleDragMove(source, sqName);
        };

        if (square) {
          const img = document.createElement('img');
          img.src = this.app.pieceImages[square.color + square.type];
          img.className = 'piece';
          img.draggable = isPlayerTurn && square.color === this.app.playerColor;
          img.ondragstart = e => {
            if (!isPlayerTurn || square.color !== this.app.playerColor) {
              e.preventDefault();
              return false;
            }
            this.app.dragSource = sqName;
            e.dataTransfer.setData('text/plain', sqName);
            e.dataTransfer.effectAllowed = 'move';
            return true;
          };
          img.ondragend = () => {
            this.app.dragSource = null;
          };
          div.appendChild(img);
        }
        fragment.appendChild(div);
      });
    });

    boardEl.appendChild(fragment);
  }

 renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow, isPractice = false) {
  console.log('📊 Rendering end game summary...');
  
  // Check if we need to create the game container
  let summaryEl = document.getElementById('endSummary');
  let msgEl = document.getElementById('theoryMessage');
  
  if (!summaryEl || !msgEl) {
    console.log('⚠️ Elements not found, forcing container recreation...');
    // Force recreate by removing existing container first
    const existingContainer = document.querySelector('.game-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Now create fresh container (NO home button here)
    document.getElementById('app').innerHTML = `
      <div class="game-container">
        <div class="board-wrapper" id="board"></div>
        <div class="info-line" id="gameCount">Loading position data...</div>
        <div id="endSummary" class="end-summary" style="display:none;"></div>
        <div id="theoryMessage" class="theory-message" style="display:none;"></div>
        <div class="action-buttons" style="display:none;">
          <button class="btn" onclick="location.reload()">🔄 New Battle</button>
          <button class="btn" id="hintBtn">🎖️ Consult Commander</button>
        </div>
      </div>
    `;
    this.renderAuthSection();
    
    // Get elements again
    summaryEl = document.getElementById('endSummary');
    msgEl = document.getElementById('theoryMessage');
    
    if (!summaryEl || !msgEl) {
      console.error('❌ Still cannot find summary elements after recreation!');
      return;
    }
  }
  
  console.log('✅ Found summary elements, rendering...');

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
    <h3 style="color: ${rankColor}; text-shadow: 0 0 20px ${rankColor}; font-size: 0.85rem; margin-bottom: 6px;">${battleRank.icon} ${battleRank.title} • Score: ${battleRank.score}/100</h3>
    <div class="stats-grid" style="gap: 5px; font-size: 0.68rem; margin: 6px 0;">
      <div style="padding: 5px;">Moves<br><strong style="font-size: 0.9rem;">${this.app.playerMoves}</strong></div>
      <div style="padding: 5px;">Book Move<br><strong style="font-size: 0.9rem;">${moveQuality}%</strong></div>
      <div style="padding: 5px;">Eval<br><strong style="font-size: 0.9rem;">${displayEval}</strong></div>
    </div>
    <div style="font-style:italic;color:${rankColor};margin:5px 0;font-size:0.49rem;">"${battleRank.msg}"</div>
    <div style="font-size:0.476rem;color:${rankColor};margin:4px 0;"><em>${battleRank.sub}</em></div>
    <div class="rank-progress" style="gap: 3px; margin: 6px 0;">
      ${['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'].map(r => {
        const color = rankColors[r];
        const isActive = r === battleRank.title;
        return `<div class="rank-step ${isActive ? 'active' : ''}" style="padding: 3px 6px; font-size: 0.65rem; ${isActive ? `background: linear-gradient(135deg, ${color}, ${color}); color: ${r === 'Hastatus' ? '#000' : '#fff'}; border-color: ${color};` : ''}">${r}</div>`;
      }).join('')}
    </div>
    
    <div style="margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
      ${isPractice ? `
      <button id="tryAgainBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        🔄 Try Again
      </button>
      ` : `
      <button id="continueCampaignBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        ⚔️ Continue Campaign
      </button>
      `}
      <button id="showAnalysisBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        📊 Analyze
      </button>
      <button id="exitBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        🚪 Exit
      </button>
    </div>

    <div style="margin-top:10px; color:#d9d9d9; font-size:0.8rem; text-align:center;">
      ${isPractice ? 'Practice games do not affect campaign merit, rank, game history, or PGN export.' : ''}
    </div>

    <div style="margin-top:10px;">
      ${this.renderDonateButtons()}
    </div>
  `;
  summaryEl.style.display = 'block';

  setTimeout(() => {
    const analysisBtn = document.getElementById('showAnalysisBtn');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    const continueCampaignBtn = document.getElementById('continueCampaignBtn');
    const exitBtn = document.getElementById('exitBtn');
    
    if (analysisBtn) {
      analysisBtn.onclick = () => this.app.showAnalysis();
    }
    
    if (tryAgainBtn) {
      tryAgainBtn.onclick = () => {
        if (isPractice && this.app.practiceOpening) {
          this.app.startPracticeOpening(this.app.practiceOpening);
        } else {
          this.app.startBattle();
        }
      };
    }
    
    if (continueCampaignBtn) {
      continueCampaignBtn.onclick = () => {
        app.renderColorChoice();
      };
    }
    
    if (exitBtn) {
      exitBtn.onclick = () => this.app.goHome();
    }
  }, 100);

  // Show historical games from this position
  if (gamesToShow && gamesToShow.length > 0) {
    let html = `<strong>Historical games from this position:</strong><br>`;
    gamesToShow.forEach((game, idx) => {
      const whitePlayer = game.white?.name || 'Unknown';
      const blackPlayer = game.black?.name || 'Unknown';
      const whiteRating = game.white?.rating || '?';
      const blackRating = game.black?.rating || '?';
      const year = game.year || '';
      const gameId = game.id || '';
      const gameUrl = gameId ? `https://lichess.org/${gameId}` : '#';
      const resultText = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '\u00bd-\u00bd';
      const resultColor = game.winner === 'white' ? '#fff' : game.winner === 'black' ? '#ccc' : '#f1c40f';
      html += `<div class="game-list-item">
        <strong>${idx + 1}.</strong> ${whitePlayer} (${whiteRating}) \u2013 ${blackPlayer} (${blackRating})${year ? `, ${year}` : ''}<br>
        <span style="color:${resultColor};">${resultText}</span> \u2022 <a href="${gameUrl}" target="_blank">View \u2197</a>
      </div>`;
    });
    msgEl.innerHTML = html;
    msgEl.style.display = 'block';
  } else {
    msgEl.innerHTML = '';
    msgEl.style.display = 'none';
  }
}
}