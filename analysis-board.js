// analysis-board.js - Post-game analysis with move navigation
// FIXED: Proper piece rendering, error handling, eval bar, exit functionality, and move comparison arrows

class AnalysisBoard {
  constructor(app) {
    this.app = app;
    this.analysisGame = null;
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.isAnalyzing = false;
    this.topMovesData = {}; // Cache for top moves at each position
  }

  async initializeAnalysis() {
    console.log('🔍 Initializing analysis board...');
    
    if (!this.app.game) {
      console.error('❌ No game available for analysis');
      alert('No game available for analysis');
      return;
    }

    try {
      // Store the current game state
      this.analysisGame = new Chess();
      
      // Get move history from the current game
      const history = this.app.game.history({ verbose: true });
      console.log('📜 Move history:', history);
      
      this.moveHistory = history;
      this.currentMoveIndex = -1;
      this.isAnalyzing = true;

      console.log(`✅ Analysis initialized with ${history.length} moves`);

      // Render the analysis interface
      this.renderAnalysisBoard();
    } catch (error) {
      console.error('❌ Analysis initialization error:', error);
      alert('Error initializing analysis: ' + error.message);
    }
  }

  renderAnalysisBoard() {
    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ App element not found');
      return;
    }

    const html = `
      <div class="game-container analysis-mode">
        <h2 style="text-align: center; color: var(--roman-gold); margin-bottom: 16px;">
          ⚔️ Battle Analysis ⚔️
        </h2>
        
        <div class="info-line" style="margin-bottom: 12px;">
          <span id="analysisPosition">Starting Position</span>
        </div>

        <div class="info-line" style="margin-bottom: 12px;">
          <span id="analysisEval">Evaluation: 0.0</span>
        </div>

        <div style="position: relative;">
          <div class="board-wrapper" id="analysisBoard"></div>
          <svg id="arrowLayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></svg>
        </div>

        <div id="moveComparisonInfo" style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.4); border-radius: 8px; font-size: 0.85rem; display: none;">
          <div style="margin-bottom: 8px; font-weight: bold; color: var(--roman-gold);">📊 Move Comparison:</div>
          <div id="moveComparisonContent"></div>
        </div>

        <div class="analysis-controls" style="margin-top: 16px;">
          <div class="action-buttons" style="justify-content: center; gap: 8px;">
            <button class="btn" id="firstMoveBtn" onclick="window.analysisBoard.goToMove(0)">
              ⮐ First
            </button>
            <button class="btn" id="prevMoveBtn" onclick="window.analysisBoard.previousMove()">
              ◀️ Prev
            </button>
            <button class="btn" id="nextMoveBtn" onclick="window.analysisBoard.nextMove()">
              Next ▶️
            </button>
            <button class="btn" id="lastMoveBtn" onclick="window.analysisBoard.goToMove(${this.moveHistory.length})">
              Last ⭢
            </button>
          </div>
        </div>

        <div class="move-list" style="margin-top: 16px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h3 style="color: var(--roman-gold); font-size: 0.9rem; margin-bottom: 8px;">Move History:</h3>
          ${this.renderMoveList()}
        </div>

        <div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 0.8rem;">
          <div style="font-weight: bold; color: var(--roman-gold); margin-bottom: 6px;">🎨 Arrow Legend:</div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 30px; height: 3px; background: #3498db;"></div>
              <span>Your Move</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 30px; height: 3px; background: #2ecc71;"></div>
              <span>Top Move</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 30px; height: 3px; background: #f1c40f;"></div>
              <span>2nd Best</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 30px; height: 3px; background: #e67e22;"></div>
              <span>3rd Best</span>
            </div>
          </div>
        </div>

        <div class="action-buttons" style="margin-top: 16px;">
          <button class="btn" onclick="window.analysisBoard.exitAnalysis()">
            ⬅️ Exit Analysis
          </button>
          <button class="btn" onclick="app.downloadPGN()">
            📥 Download PGN
          </button>
        </div>
      </div>
    `;

    app.innerHTML = html;
    this.updateBoard();
    this.updateNavigationButtons();
    this.updatePositionInfo(); // Initial eval load
    console.log('✅ Analysis board rendered');
  }

  renderBoard() {
    const board = this.analysisGame.board();
    const boardEl = document.getElementById('analysisBoard');
    if (!boardEl) return;
    
    boardEl.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        const isLight = (row + col) % 2 === 0;
        const square = 'abcdefgh'[col] + (8 - row);
        
        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'}`;
        div.setAttribute('data-square', square);
        
        if (piece) {
          const pieceKey = piece.color + piece.type;
          const img = document.createElement('img');
          img.src = this.app.pieceImages[pieceKey];
          img.className = 'piece';
          img.alt = piece.type;
          div.appendChild(img);
        }
        
        boardEl.appendChild(div);
      }
    }
  }

  renderMoveList() {
    if (this.moveHistory.length === 0) {
      return '<div style="color: #888; font-style: italic;">No moves yet</div>';
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 0.85rem;">';
    
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = this.moveHistory[i];
      const blackMove = this.moveHistory[i + 1];
      
      const whiteClass = this.currentMoveIndex === i ? 'active' : '';
      const blackClass = this.currentMoveIndex === i + 1 ? 'active' : '';
      
      html += `
        <div style="display: contents;">
          <div 
            class="move-item ${whiteClass}" 
            onclick="window.analysisBoard.goToMove(${i + 1})"
            style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${whiteClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}"
          >
            ${moveNum}. ${whiteMove.san}
          </div>
          ${blackMove ? `
            <div 
              class="move-item ${blackClass}" 
              onclick="window.analysisBoard.goToMove(${i + 2})"
              style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${blackClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}"
            >
              ${blackMove.san}
            </div>
          ` : '<div></div>'}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  goToMove(moveIndex) {
    console.log(`Going to move ${moveIndex}`);
    
    // Reset game to start
    this.analysisGame.reset();
    
    // Replay moves up to the target index
    for (let i = 0; i < moveIndex && i < this.moveHistory.length; i++) {
      const move = this.moveHistory[i];
      try {
        this.analysisGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      } catch (error) {
        console.error('Error replaying move:', error, move);
        break;
      }
    }
    
    this.currentMoveIndex = moveIndex - 1;
    this.updateBoard();
    this.updateNavigationButtons();
    this.updatePositionInfo();
  }

  nextMove() {
    if (this.currentMoveIndex < this.moveHistory.length - 1) {
      const nextMove = this.moveHistory[this.currentMoveIndex + 1];
      try {
        this.analysisGame.move({
          from: nextMove.from,
          to: nextMove.to,
          promotion: nextMove.promotion
        });
        this.currentMoveIndex++;
        this.updateBoard();
        this.updateNavigationButtons();
        this.updatePositionInfo();
      } catch (error) {
        console.error('Error making next move:', error, nextMove);
      }
    }
  }

  previousMove() {
    if (this.currentMoveIndex >= 0) {
      try {
        this.analysisGame.undo();
        this.currentMoveIndex--;
        this.updateBoard();
        this.updateNavigationButtons();
        this.updatePositionInfo();
      } catch (error) {
        console.error('Error undoing move:', error);
      }
    }
  }

  updateBoard() {
    this.renderBoard();
    
    // Update move list highlighting
    const moveListContainer = document.querySelector('.move-list');
    if (moveListContainer) {
      const h3 = moveListContainer.querySelector('h3');
      const moveListHTML = this.renderMoveList();
      moveListContainer.innerHTML = '';
      if (h3) moveListContainer.appendChild(h3);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = moveListHTML;
      while (tempDiv.firstChild) {
        moveListContainer.appendChild(tempDiv.firstChild);
      }
    }
  }

  updateNavigationButtons() {
    const firstBtn = document.getElementById('firstMoveBtn');
    const prevBtn = document.getElementById('prevMoveBtn');
    const nextBtn = document.getElementById('nextMoveBtn');
    const lastBtn = document.getElementById('lastMoveBtn');

    if (firstBtn) firstBtn.disabled = this.currentMoveIndex < 0;
    if (prevBtn) prevBtn.disabled = this.currentMoveIndex < 0;
    if (nextBtn) nextBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
    if (lastBtn) lastBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
  }

  async updatePositionInfo() {
    const posInfo = document.getElementById('analysisPosition');
    if (posInfo) {
      if (this.currentMoveIndex < 0) {
        posInfo.textContent = 'Starting Position';
      } else {
        const moveNum = Math.floor(this.currentMoveIndex / 2) + 1;
        const side = this.currentMoveIndex % 2 === 0 ? 'White' : 'Black';
        const move = this.moveHistory[this.currentMoveIndex];
        posInfo.textContent = `Move ${moveNum} (${side}): ${move.san}`;
      }
    }
    
    // Update evaluation
    await this.updateEvaluation();
    
    // Update move comparison arrows
    await this.updateMoveComparison();
  }

  async updateEvaluation() {
    const evalEl = document.getElementById('analysisEval');
    if (!evalEl) return;
    
    try {
      const fen = this.analysisGame.fen();
      evalEl.textContent = 'Evaluation: Calculating...';
      
      const rawEval = await ChessAPI.getEvaluation(fen, this.app.evalCache);
      const displayEval = rawEval > 0 ? '+' + rawEval.toFixed(1) : rawEval.toFixed(1);
      
      evalEl.textContent = `Evaluation: ${displayEval}`;
      evalEl.style.color = rawEval > 1 ? '#2ecc71' : rawEval < -1 ? '#e74c3c' : '#f1c40f';
    } catch (error) {
      console.error('Error updating evaluation:', error);
      evalEl.textContent = 'Evaluation: N/A';
    }
  }

  async updateMoveComparison() {
    const infoEl = document.getElementById('moveComparisonInfo');
    const contentEl = document.getElementById('moveComparisonContent');
    const arrowLayer = document.getElementById('arrowLayer');
    
    if (!infoEl || !contentEl || !arrowLayer) return;
    
    // Clear arrows
    arrowLayer.innerHTML = '';
    
    // Only show comparison if we're looking at a move (not starting position)
    if (this.currentMoveIndex < 0) {
      infoEl.style.display = 'none';
      return;
    }
    
    try {
      // Get the position BEFORE the current move
      const tempGame = new Chess();
      for (let i = 0; i < this.currentMoveIndex; i++) {
        const move = this.moveHistory[i];
        tempGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      }
      
      const positionFen = tempGame.fen();
      const playerMove = this.moveHistory[this.currentMoveIndex];
      
      // Fetch top moves from database (use cached if available)
      if (!this.topMovesData[positionFen]) {
        contentEl.textContent = 'Loading database moves...';
        infoEl.style.display = 'block';
        
        const data = await ChessAPI.queryExplorer(this.app.aiSource, positionFen);
        this.topMovesData[positionFen] = data.moves || [];
      }
      
      const topMoves = this.topMovesData[positionFen].slice(0, 5);
      
      if (topMoves.length === 0) {
        infoEl.style.display = 'none';
        return;
      }
      
      // Find player move in top moves
      const playerMoveUci = playerMove.from + playerMove.to + (playerMove.promotion || '');
      const playerMoveIndex = topMoves.findIndex(m => m.uci === playerMoveUci);
      
      // Draw arrows
      this.drawMoveArrows(playerMove, topMoves.slice(0, 3), playerMoveIndex);
      
      // Build comparison text
      let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
      
      // Show top 5 moves with stats
      topMoves.forEach((move, idx) => {
        const isPlayerMove = move.uci === playerMoveUci;
        const totalGames = move.white + move.draws + move.black;
        const winRate = totalGames > 0 ? ((move.white / totalGames) * 100).toFixed(1) : 0;
        
        const bgColor = isPlayerMove ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.05)';
        const borderColor = isPlayerMove ? '#3498db' : 'transparent';
        
        html += `
          <div style="padding: 6px 8px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-weight: bold; color: ${idx === 0 ? '#2ecc71' : idx === 1 ? '#f1c40f' : idx === 2 ? '#e67e22' : '#bbb'};">
                ${idx + 1}. ${move.san}
              </span>
              ${isPlayerMove ? '<span style="margin-left: 6px; color: #3498db; font-weight: bold;">← Your Move</span>' : ''}
            </div>
            <div style="font-size: 0.75rem; color: #aaa;">
              ${totalGames.toLocaleString()} games • ${winRate}% wins
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      // Add verdict
      if (playerMoveIndex === 0) {
        html += '<div style="margin-top: 8px; padding: 8px; background: rgba(46, 204, 113, 0.2); border-left: 3px solid #2ecc71; border-radius: 4px; font-weight: bold;">✅ Excellent! Top move played.</div>';
      } else if (playerMoveIndex === 1 || playerMoveIndex === 2) {
        html += '<div style="margin-top: 8px; padding: 8px; background: rgba(241, 196, 15, 0.2); border-left: 3px solid #f1c40f; border-radius: 4px;">⚠️ Good move, but not the most popular.</div>';
      } else if (playerMoveIndex === 3 || playerMoveIndex === 4) {
        html += '<div style="margin-top: 8px; padding: 8px; background: rgba(230, 126, 34, 0.2); border-left: 3px solid #e67e22; border-radius: 4px;">⚡ Playable, but less common.</div>';
      } else {
        html += '<div style="margin-top: 8px; padding: 8px; background: rgba(231, 76, 60, 0.2); border-left: 3px solid #e74c3c; border-radius: 4px;">❌ Rare or weak move.</div>';
      }
      
      contentEl.innerHTML = html;
      infoEl.style.display = 'block';
      
    } catch (error) {
      console.error('Error updating move comparison:', error);
      infoEl.style.display = 'none';
    }
  }

  drawMoveArrows(playerMove, topMoves, playerMoveIndex) {
    const arrowLayer = document.getElementById('arrowLayer');
    const boardEl = document.getElementById('analysisBoard');
    if (!arrowLayer || !boardEl) return;
    
    const boardRect = boardEl.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    
    // Helper to convert square to coordinates
    const squareToCoords = (square) => {
      const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
      const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.
      return {
        x: (file + 0.5) * squareSize,
        y: (rank + 0.5) * squareSize
      };
    };
    
    // Set SVG viewBox
    arrowLayer.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    
    // Draw player move (blue)
    const playerFrom = squareToCoords(playerMove.from);
    const playerTo = squareToCoords(playerMove.to);
    this.drawArrow(arrowLayer, playerFrom, playerTo, '#3498db', 8);
    
    // Draw top 3 moves from database
    const colors = ['#2ecc71', '#f1c40f', '#e67e22']; // Green, Yellow, Orange
    topMoves.forEach((move, idx) => {
      // Don't draw arrow if it's the same as player move
      const moveUci = move.uci;
      const playerUci = playerMove.from + playerMove.to + (playerMove.promotion || '');
      if (moveUci === playerUci) return;
      
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const fromCoords = squareToCoords(from);
      const toCoords = squareToCoords(to);
      
      this.drawArrow(arrowLayer, fromCoords, toCoords, colors[idx], 6);
    });
  }

  drawArrow(svg, from, to, color, width) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Shorten the arrow to not overlap pieces
    const shortenBy = 20;
    const adjustedLength = length - shortenBy;
    const startX = from.x + Math.cos(angle) * (shortenBy / 2);
    const startY = from.y + Math.sin(angle) * (shortenBy / 2);
    const endX = startX + Math.cos(angle) * adjustedLength;
    const endY = startY + Math.sin(angle) * adjustedLength;
    
    // Arrow head
    const headLength = 15;
    const headAngle = Math.PI / 6;
    
    const head1X = endX - headLength * Math.cos(angle - headAngle);
    const head1Y = endY - headLength * Math.sin(angle - headAngle);
    const head2X = endX - headLength * Math.cos(angle + headAngle);
    const head2Y = endY - headLength * Math.sin(angle + headAngle);
    
    // Draw line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.8');
    svg.appendChild(line);
    
    // Draw arrow head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
    head.setAttribute('fill', color);
    head.setAttribute('opacity', '0.8');
    svg.appendChild(head);
  }

  exitAnalysis() {
    console.log('Exiting analysis mode');
    this.isAnalyzing = false;
    this.analysisGame = null;
    this.currentMoveIndex = -1;
    this.moveHistory = [];
    this.topMovesData = {};
    
    // Clear global reference
    if (window.analysisBoard === this) {
      window.analysisBoard = null;
    }
    
    // Return to main game view
    this.app.render();
  }
}

// Make it globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.AnalysisBoard = AnalysisBoard;
  console.log('✅ AnalysisBoard class loaded');
}