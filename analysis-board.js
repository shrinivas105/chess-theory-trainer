// analysis-board.js - Interactive analysis board in modal overlay

class AnalysisBoard {
  constructor(app) {
    this.app = app;
    this.analysisGame = null;
    this.currentMoveIndex = -1;
    this.moveHistory = [];
    this.evaluations = [];
    this.isAnalyzing = false;
  }

  async initializeAnalysis() {
    // Create a copy of the game for analysis
    this.analysisGame = new Chess();
    this.moveHistory = this.app.game.history({ verbose: true });
    this.currentMoveIndex = -1;
    this.evaluations = [];
    this.isAnalyzing = true;

    // Render the analysis modal
    this.render();

    // Show loading message
    const moveListEl = document.getElementById('moveList');
    if (moveListEl) {
      moveListEl.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;">⏳ Calculating evaluations...</div>';
    }

    // Get evaluations for each position
    await this.calculateEvaluations();
    
    // Update the display with evaluations
    this.goToMove(-1);
  }

  async calculateEvaluations() {
    const tempGame = new Chess();
    this.evaluations = [{ positionEval: 0, move: null }]; // Starting position

    for (let i = 0; i < this.moveHistory.length; i++) {
      tempGame.move(this.moveHistory[i]);
      const fen = tempGame.fen();
      const rawEval = await ChessAPI.getEvaluation(fen, this.app.evalCache);
      
      const movingColor = this.moveHistory[i].color;
      const playerEval = Scoring.getPlayerEval(rawEval, this.app.playerColor);
      
      this.evaluations.push({
        positionEval: rawEval,
        playerEval: playerEval,
        move: this.moveHistory[i],
        moveNumber: Math.floor(i / 2) + 1,
        isWhiteMove: movingColor === 'w'
      });
    }
  }

  goToMove(index) {
    this.currentMoveIndex = index;
    this.analysisGame = new Chess();
    
    for (let i = 0; i <= index; i++) {
      this.analysisGame.move(this.moveHistory[i]);
    }
    
    this.renderAnalysisBoard();
    this.updateMoveList();
    this.updateEvalBar();
  }

  firstMove() {
    this.goToMove(-1);
  }

  previousMove() {
    if (this.currentMoveIndex >= 0) {
      this.goToMove(this.currentMoveIndex - 1);
    }
  }

  nextMove() {
    if (this.currentMoveIndex < this.moveHistory.length - 1) {
      this.goToMove(this.currentMoveIndex + 1);
    }
  }

  lastMove() {
    this.goToMove(this.moveHistory.length - 1);
  }

  getEvalColor(positionEval) {
    if (positionEval > 2) return '#4caf50';
    if (positionEval > 0.5) return '#8bc34a';
    if (positionEval > -0.5) return '#ffc107';
    if (positionEval > -2) return '#ff9800';
    return '#f44336';
  }

  getEvalText(evalData) {
    if (!evalData) return '0.0';
    const val = evalData.positionEval;
    if (Math.abs(val) > 9) return val > 0 ? '+M' : '-M';
    return (val > 0 ? '+' : '') + val.toFixed(1);
  }

  renderAnalysisBoard() {
    const boardEl = document.getElementById('analysisBoard');
    if (!boardEl) return;

    const board = this.analysisGame.board();
    const isFlipped = this.app.playerColor === 'b';
    const renderedBoard = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;

    boardEl.innerHTML = '';

    renderedBoard.forEach((row, r) => {
      row.forEach((square, c) => {
        const actualRow = isFlipped ? 7 - r : r;
        const actualCol = isFlipped ? 7 - c : c;
        const isLight = (actualRow + actualCol) % 2 === 0;

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'}`;
        div.style.cursor = 'default';

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

  updateEvalBar() {
    const evalBarFill = document.getElementById('evalBarFill');
    const evalText = document.getElementById('evalText');
    
    if (!evalBarFill || !evalText) return;
    
    const currentEval = this.evaluations[this.currentMoveIndex + 1];
    if (!currentEval) {
      evalBarFill.style.height = '50%';
      evalText.textContent = '0.0';
      evalText.style.color = '#ffc107';
      return;
    }

    const positionEval = currentEval.positionEval;
    const percentage = Math.max(0, Math.min(100, 50 + (positionEval * 5)));
    
    evalBarFill.style.height = percentage + '%';
    evalText.textContent = this.getEvalText(currentEval);
    evalText.style.color = this.getEvalColor(positionEval);
  }

  updateMoveList() {
    const moveListEl = document.getElementById('moveList');
    if (!moveListEl) return;

    let html = '';
    for (let i = 0; i < this.moveHistory.length; i++) {
      const move = this.moveHistory[i];
      const evalData = this.evaluations[i + 1];
      const isWhiteMove = move.color === 'w';
      const isActive = i === this.currentMoveIndex;
      const isPlayerMove = move.color === this.app.playerColor;

      if (isWhiteMove) {
        html += `<div class="move-pair">`;
        html += `<span class="move-number">${Math.floor(i / 2) + 1}.</span>`;
      }

      let moveQuality = '';
      if (isPlayerMove && evalData && i > 0) {
        const prevEval = this.evaluations[i].positionEval;
        const currentEval = evalData.positionEval;
        
        const evalChange = this.app.playerColor === 'w' 
          ? currentEval - prevEval 
          : prevEval - currentEval;
        
        if (evalChange < -1.5) moveQuality = ' ??';
        else if (evalChange < -0.5) moveQuality = ' ?';
        else if (evalChange < -0.2) moveQuality = ' ?!';
        else moveQuality = ' ✓';
      }

      html += `<span class="move-item ${isActive ? 'active' : ''} ${isPlayerMove ? 'player-move' : ''}" 
                     onclick="window.app.analysisBoard.goToMove(${i})">
                ${move.san}${moveQuality}
              </span>`;

      if (!isWhiteMove || i === this.moveHistory.length - 1) {
        html += `</div>`;
      }
    }

    moveListEl.innerHTML = html || '<div style="text-align:center;color:#888;">No moves to display</div>';
  }

  render() {
    // Create modal overlay
    let modal = document.getElementById('analysisModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'analysisModal';
      modal.className = 'analysis-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="analysis-modal-content">
        <div class="analysis-modal-header">
          <h3 style="color:var(--gold); font-family:'Cinzel', serif; margin:0;">
            📊 Game Analysis
          </h3>
          <button class="analysis-close-btn" onclick="window.app.analysisBoard.close()">✕</button>
        </div>
        
        <div class="analysis-body">
          <div class="analysis-main">
            <!-- Analysis Board -->
            <div class="analysis-board-wrapper">
              <div id="analysisBoard" class="analysis-board"></div>
            </div>

            <!-- Evaluation Bar (beside board on desktop, above on mobile) -->
            <div class="eval-bar-container">
              <div class="eval-text" id="evalText">0.0</div>
              <div class="eval-bar">
                <div id="evalBarFill" class="eval-bar-fill"></div>
              </div>
            </div>
          </div>

          <!-- Move List -->
          <div class="move-list-wrapper">
            <div id="moveList" class="move-list"></div>
          </div>

          <!-- Navigation Controls -->
          <div class="analysis-controls">
            <button onclick="window.app.analysisBoard.firstMove()" class="analysis-btn" title="First Move">⏮️</button>
            <button onclick="window.app.analysisBoard.previousMove()" class="analysis-btn" title="Previous">◀️</button>
            <button onclick="window.app.analysisBoard.nextMove()" class="analysis-btn" title="Next">▶️</button>
            <button onclick="window.app.analysisBoard.lastMove()" class="analysis-btn" title="Last Move">⏭️</button>
          </div>

          <div style="margin-top:8px; text-align:center; font-size:0.75rem; color:#bbb;">
            <strong>Legend:</strong> ✓ Good | ?! Inaccuracy | ? Mistake | ?? Blunder
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.close();
      }
    };
  }

  close() {
    this.isAnalyzing = false;
    const modal = document.getElementById('analysisModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

console.log('✓ AnalysisBoard class loaded successfully');