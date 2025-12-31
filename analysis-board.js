// analysis-board.js - Post-game analysis with move navigation
// Fixed version with proper initialization and debugging

class AnalysisBoard {
  constructor(app) {
    this.app = app;
    this.analysisGame = null;
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.isAnalyzing = false;
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

        <div class="board-wrapper" id="analysisBoard" style="display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr);">
          ${this.renderBoard()}
        </div>

        <div class="analysis-controls" style="margin-top: 16px;">
          <div class="action-buttons" style="justify-content: center; gap: 8px;">
            <button class="btn" id="firstMoveBtn" onclick="window.analysisBoard.goToMove(0)">
              ⏮️ First
            </button>
            <button class="btn" id="prevMoveBtn" onclick="window.analysisBoard.previousMove()">
              ◀️ Prev
            </button>
            <button class="btn" id="nextMoveBtn" onclick="window.analysisBoard.nextMove()">
              Next ▶️
            </button>
            <button class="btn" id="lastMoveBtn" onclick="window.analysisBoard.goToMove(${this.moveHistory.length})">
              Last ⏭️
            </button>
          </div>
        </div>

        <div class="move-list" style="margin-top: 16px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h3 style="color: var(--roman-gold); font-size: 0.9rem; margin-bottom: 8px;">Move History:</h3>
          ${this.renderMoveList()}
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
    this.updateNavigationButtons();
    console.log('✅ Analysis board rendered');
  }

  renderBoard() {
    const board = this.analysisGame.board();
    let html = '';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        const isLight = (row + col) % 2 === 0;
        const square = 'abcdefgh'[col] + (8 - row);
        
        html += `
          <div class="square ${isLight ? 'light' : 'dark'}" 
               data-square="${square}">
            ${piece ? `<img src="${this.app.pieceImages[piece.color][piece.type]}" class="piece" alt="${piece.type}">` : ''}
          </div>
        `;
      }
    }
    
    return html;
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
      this.analysisGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
    }
    
    this.currentMoveIndex = moveIndex - 1;
    this.updateBoard();
    this.updateNavigationButtons();
    this.updatePositionInfo();
  }

  nextMove() {
    if (this.currentMoveIndex < this.moveHistory.length - 1) {
      const nextMove = this.moveHistory[this.currentMoveIndex + 1];
      this.analysisGame.move({
        from: nextMove.from,
        to: nextMove.to,
        promotion: nextMove.promotion
      });
      this.currentMoveIndex++;
      this.updateBoard();
      this.updateNavigationButtons();
      this.updatePositionInfo();
    }
  }

  previousMove() {
    if (this.currentMoveIndex >= 0) {
      this.analysisGame.undo();
      this.currentMoveIndex--;
      this.updateBoard();
      this.updateNavigationButtons();
      this.updatePositionInfo();
    }
  }

  updateBoard() {
    const boardEl = document.getElementById('analysisBoard');
    if (boardEl) {
      boardEl.innerHTML = this.renderBoard();
    }
    
    // Update move list highlighting
    const moveListEl = document.querySelector('.move-list');
    if (moveListEl) {
      const moveListContent = moveListEl.querySelector('div');
      if (moveListContent) {
        moveListContent.outerHTML = this.renderMoveList();
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

  updatePositionInfo() {
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
  }

  exitAnalysis() {
    console.log('Exiting analysis mode');
    this.isAnalyzing = false;
    this.analysisGame = null;
    this.app.render();
  }
}

// Make it globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.AnalysisBoard = AnalysisBoard;
  console.log('✅ AnalysisBoard class loaded');
}