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
        <h2 style="text-align: center; color: var(--roman-gold); margin-bottom: 8px; font-size: 1.3rem;">
          ⚔️ Battle Analysis ⚔️
        </h2>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
          <span id="analysisPosition" style="color: #fff;">Starting Position</span>
          <span id="analysisEval" style="color: #f1c40f;">Eval: 0.0</span>
        </div>

        <div style="position: relative;">
          <div class="board-wrapper" id="analysisBoard"></div>
          <svg id="arrowLayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></svg>
        </div>

        <div class="analysis-controls" style="margin-top: 10px;">
          <div class="action-buttons" style="justify-content: center; gap: 6px; flex-wrap: wrap;">
            <button class="btn" id="firstMoveBtn" onclick="window.analysisBoard.goToMove(0)" style="padding: 8px 12px; font-size: 0.85rem;">
              ⮐ First
            </button>
            <button class="btn" id="prevMoveBtn" onclick="window.analysisBoard.previousMove()" style="padding: 8px 12px; font-size: 0.85rem;">
              ◀️ Prev
            </button>
            <button class="btn" id="nextMoveBtn" onclick="window.analysisBoard.nextMove()" style="padding: 8px 12px; font-size: 0.85rem;">
              Next ▶️
            </button>
            <button class="btn" id="lastMoveBtn" onclick="window.analysisBoard.goToMove(${this.moveHistory.length})" style="padding: 8px 12px; font-size: 0.85rem;">
              Last ⭢
            </button>
          </div>
        </div>

        <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.75rem;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; align-items: center;">
            <span style="font-weight: bold; color: var(--roman-gold);">Arrows:</span>
            <div style="display: flex; align-items: center; gap: 3px;">
              <div style="width: 20px; height: 2px; background: #3498db;"></div>
              <span>You</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <div style="width: 20px; height: 2px; background: #2ecc71;"></div>
              <span>Top</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <div style="width: 20px; height: 2px; background: #f1c40f;"></div>
              <span>2nd</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <div style="width: 20px; height: 2px; background: #e67e22;"></div>
              <span>3rd</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <div style="width: 20px; height: 6px; background: linear-gradient(to bottom, #3498db 0%, #3498db 40%, #2ecc71 60%, #2ecc71 100%); border-radius: 1px;"></div>
              <span>You = Top!</span>
            </div>
          </div>
        </div>

        <div class="action-buttons" style="margin-top: 10px; gap: 6px;">
          <button class="btn" onclick="window.analysisBoard.exitAnalysis()" style="padding: 8px 14px; font-size: 0.85rem;">
            ⬅️ Exit
          </button>
          <button class="btn" onclick="app.downloadPGN()" style="padding: 8px 14px; font-size: 0.85rem;">
            📥 PGN
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
    
    // Check if board should be flipped (player is black)
    const isFlipped = this.app.playerColor === 'b';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Flip coordinates if player is black
        const displayRow = isFlipped ? 7 - row : row;
        const displayCol = isFlipped ? 7 - col : col;
        
        const piece = board[displayRow][displayCol];
        const isLight = (row + col) % 2 === 0;
        const square = 'abcdefgh'[displayCol] + (8 - displayRow);
        
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
      
      // Determine if moves are player moves based on player color
      const isWhitePlayer = this.app.playerColor === 'w';
      const whiteIsPlayer = isWhitePlayer;
      const blackIsPlayer = !isWhitePlayer;
      
      html += `
        <div style="display: contents;">
          <div 
            class="move-item ${whiteClass}" 
            onclick="window.analysisBoard.goToMove(${i + 1})"
            style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${whiteClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}; ${whiteIsPlayer ? '' : 'opacity: 0.6;'}"
          >
            ${moveNum}. ${whiteMove.san}${whiteIsPlayer ? '' : ' 🤖'}
          </div>
          ${blackMove ? `
            <div 
              class="move-item ${blackClass}" 
              onclick="window.analysisBoard.goToMove(${i + 2})"
              style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${blackClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}; ${blackIsPlayer ? '' : 'opacity: 0.6;'}"
            >
              ${blackMove.san}${blackIsPlayer ? '' : ' 🤖'}
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
        const side = this.currentMoveIndex % 2 === 0 ? 'W' : 'B';
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
      evalEl.textContent = 'Eval: ...';
      
      const rawEval = await ChessAPI.getEvaluation(fen, this.app.evalCache);
      const displayEval = rawEval > 0 ? '+' + rawEval.toFixed(1) : rawEval.toFixed(1);
      
      evalEl.textContent = `Eval: ${displayEval}`;
      evalEl.style.color = rawEval > 1 ? '#2ecc71' : rawEval < -1 ? '#e74c3c' : '#f1c40f';
    } catch (error) {
      console.error('Error updating evaluation:', error);
      evalEl.textContent = 'Eval: N/A';
    }
  }

  async updateMoveComparison() {
    const arrowLayer = document.getElementById('arrowLayer');
    
    if (!arrowLayer) return;
    
    // Clear arrows
    arrowLayer.innerHTML = '';
    
    // Only show comparison if we're looking at a PLAYER move (not starting position or AI move)
    if (this.currentMoveIndex < 0) {
      return;
    }
    
    // Check if current move is a player move
    const playerMove = this.moveHistory[this.currentMoveIndex];
    const moveNumber = this.currentMoveIndex;
    const isWhiteMove = moveNumber % 2 === 0;
    const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) || 
                         (this.app.playerColor === 'b' && !isWhiteMove);
    
    // Skip if this is an AI move
    if (!isPlayerMove) {
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
      
      // Fetch top moves from database (use cached if available)
      if (!this.topMovesData[positionFen]) {
        const data = await ChessAPI.queryExplorer(this.app.aiSource, positionFen);
        this.topMovesData[positionFen] = data.moves || [];
      }
      
      const topMoves = this.topMovesData[positionFen].slice(0, 5);
      
      if (topMoves.length === 0) {
        return;
      }
      
      // Find player move in top moves
      const playerMoveUci = playerMove.from + playerMove.to + (playerMove.promotion || '');
      const playerMoveIndex = topMoves.findIndex(m => m.uci === playerMoveUci);
      
      // Draw arrows
      this.drawMoveArrows(playerMove, topMoves.slice(0, 3), playerMoveIndex);
      
    } catch (error) {
      console.error('Error updating move comparison:', error);
    }
  }

  drawMoveArrows(playerMove, topMoves, playerMoveIndex) {
    const arrowLayer = document.getElementById('arrowLayer');
    const boardEl = document.getElementById('analysisBoard');
    if (!arrowLayer || !boardEl) return;
    
    const boardRect = boardEl.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    const isFlipped = this.app.playerColor === 'b';
    
    // Helper to convert square to coordinates
    const squareToCoords = (square) => {
      const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
      const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.
      
      // Flip coordinates if board is flipped
      const displayFile = isFlipped ? 7 - file : file;
      const displayRank = isFlipped ? 7 - rank : rank;
      
      return {
        x: (displayFile + 0.5) * squareSize,
        y: (displayRank + 0.5) * squareSize
      };
    };
    
    // Set SVG viewBox
    arrowLayer.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    
    // Check if player move is the top move
    const playerMoveUci = playerMove.from + playerMove.to + (playerMove.promotion || '');
    const isTopMove = topMoves.length > 0 && topMoves[0].uci === playerMoveUci;
    
    if (isTopMove) {
      // If player move is top move, draw a special dual-color arrow (green with blue border)
      const playerFrom = squareToCoords(playerMove.from);
      const playerTo = squareToCoords(playerMove.to);
      this.drawArrow(arrowLayer, playerFrom, playerTo, '#3498db', 12, '#2ecc71'); // Blue border, green fill
    } else {
      // Draw player move (blue) - draw this first so top moves appear on top
      const playerFrom = squareToCoords(playerMove.from);
      const playerTo = squareToCoords(playerMove.to);
      this.drawArrow(arrowLayer, playerFrom, playerTo, '#3498db', 8);
      
      // Draw top 3 moves from database
      const colors = ['#2ecc71', '#f1c40f', '#e67e22']; // Green, Yellow, Orange
      topMoves.forEach((move, idx) => {
        // Don't draw arrow if it's the same as player move
        const moveUci = move.uci;
        if (moveUci === playerMoveUci) return;
        
        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);
        const fromCoords = squareToCoords(from);
        const toCoords = squareToCoords(to);
        
        this.drawArrow(arrowLayer, fromCoords, toCoords, colors[idx], 6);
      });
    }
  }

  drawArrow(svg, from, to, color, width, outlineColor = null) {
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
    
    // If outline color provided, draw outline first (for dual-color effect)
    if (outlineColor) {
      const outlineWidth = width + 4;
      
      const outlineLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      outlineLine.setAttribute('x1', startX);
      outlineLine.setAttribute('y1', startY);
      outlineLine.setAttribute('x2', endX);
      outlineLine.setAttribute('y2', endY);
      outlineLine.setAttribute('stroke', color);
      outlineLine.setAttribute('stroke-width', outlineWidth);
      outlineLine.setAttribute('stroke-linecap', 'round');
      outlineLine.setAttribute('opacity', '0.8');
      svg.appendChild(outlineLine);
      
      const outlineHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      outlineHead.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
      outlineHead.setAttribute('fill', color);
      outlineHead.setAttribute('opacity', '0.8');
      svg.appendChild(outlineHead);
      
      // Now use outline color as main color for the inner arrow
      color = outlineColor;
    }
    
    // Draw line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.9');
    svg.appendChild(line);
    
    // Draw arrow head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
    head.setAttribute('fill', color);
    head.setAttribute('opacity', '0.9');
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