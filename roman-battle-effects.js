// roman-battle-effects.js - Optional visual enhancements
// Add this file BEFORE main.js in your index.html

class RomanBattleEffects {
  constructor() {
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
    this.init();
  }

  init() {
    // Create particle canvas overlay
    this.createParticleCanvas();
    
    // Start particle animation
    this.animateParticles();
    
    // Add sound effect triggers (optional)
    this.setupSoundTriggers();
  }

  createParticleCanvas() {
    // Create canvas for atmospheric dust particles
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.opacity = '0.3';
    document.body.insertBefore(this.canvas, document.body.firstChild);
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Create initial particles
    this.createParticles(30);
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles(count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  animateParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      // Draw particle (dust mote)
      this.ctx.fillStyle = `rgba(212, 175, 55, ${particle.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Update position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Reset if out of bounds
      if (particle.y > this.canvas.height) {
        particle.y = -10;
        particle.x = Math.random() * this.canvas.width;
      }
      if (particle.x < 0) particle.x = this.canvas.width;
      if (particle.x > this.canvas.width) particle.x = 0;
    });
    
    requestAnimationFrame(() => this.animateParticles());
  }

  setupSoundTriggers() {
    // Add subtle sound effects when pieces move (optional)
    // You can integrate actual audio files here
    document.addEventListener('click', (e) => {
      if (e.target.closest('.square')) {
        this.createMoveDust(e.clientX, e.clientY);
      }
    });
  }

  createMoveDust(x, y) {
    // Create temporary dust cloud when piece moves
    const dustCloud = document.createElement('div');
    dustCloud.style.position = 'fixed';
    dustCloud.style.left = x + 'px';
    dustCloud.style.top = y + 'px';
    dustCloud.style.width = '40px';
    dustCloud.style.height = '40px';
    dustCloud.style.borderRadius = '50%';
    dustCloud.style.background = 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)';
    dustCloud.style.pointerEvents = 'none';
    dustCloud.style.zIndex = '1000';
    dustCloud.style.transform = 'translate(-50%, -50%) scale(0)';
    dustCloud.style.transition = 'all 0.6s ease-out';
    document.body.appendChild(dustCloud);
    
    setTimeout(() => {
      dustCloud.style.transform = 'translate(-50%, -50%) scale(3)';
      dustCloud.style.opacity = '0';
    }, 10);
    
    setTimeout(() => {
      dustCloud.remove();
    }, 600);
  }

  // Battle sound effects
  static playMoveSound() {
    try {
      const audio = new Audio('forward.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Move sound failed:', e));
      console.log('🗿 Stone piece moved');
    } catch (e) {
      console.log('Move sound error:', e);
    }
  }

  static playCaptureSound() {
    try {
      const audio = new Audio('attack.mp3');
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Capture sound failed:', e));
      console.log('⚔️ Piece captured!');
    } catch (e) {
      console.log('Capture sound error:', e);
    }
  }

  static playPromotionSound() {
    // Example: new Audio('sounds/horn-triumph.mp3').play();
    console.log('🎺 Legion promoted!');
  }
}

// Additional visual enhancement functions
const RomanVisuals = {
  // Add battle banners to corners
  addBattleBanners() {
    const positions = [
      { top: '20px', left: '20px' },
      { top: '20px', right: '20px' },
      { bottom: '20px', left: '20px' },
      { bottom: '20px', right: '20px' }
    ];
    
    positions.forEach((pos, index) => {
      const banner = document.createElement('div');
      banner.style.position = 'fixed';
      Object.assign(banner.style, pos);
      banner.style.fontSize = '2rem';
      banner.style.opacity = '0.2';
      banner.style.zIndex = '0';
      banner.style.animation = 'battleFlag 4s ease-in-out infinite';
      banner.style.animationDelay = `${index * 0.5}s`;
      banner.innerHTML = ['🏛️', '⚔️', '🛡️', '🏺'][index];
      document.body.appendChild(banner);
    });
  },

  // Add centurion helmet decoration
  addHelmetDecoration(element) {
    const helmet = document.createElement('span');
    helmet.innerHTML = '🪖';
    helmet.style.marginLeft = '8px';
    helmet.style.opacity = '0.7';
    element.appendChild(helmet);
  },

  // Enhanced square highlighting for possible moves
  highlightPossibleMoves(game, square) {
    const moves = game.moves({ square: square, verbose: true });
    
    moves.forEach(move => {
      const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
      if (targetSquare) {
        const indicator = document.createElement('div');
        indicator.className = 'move-indicator';
        indicator.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: radial-gradient(circle, rgba(212,175,55,0.8) 0%, transparent 100%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 5;
          animation: glowPulse 2s ease-in-out infinite;
        `;
        targetSquare.appendChild(indicator);
      }
    });
  },

  // Clear move indicators
  clearMoveIndicators() {
    document.querySelectorAll('.move-indicator').forEach(el => el.remove());
  },

  // Add dramatic piece capture effect
  createCaptureEffect(square) {
    const rect = square.getBoundingClientRect();
    
    // Create explosion effect
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      spark.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        width: 4px;
        height: 4px;
        background: var(--roman-gold);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(spark);
      
      const angle = (Math.PI * 2 * i) / 8;
      const distance = 40;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      spark.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 }
      ], {
        duration: 600,
        easing: 'ease-out'
      }).onfinish = () => spark.remove();
    }
  }
};

// Initialize effects when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.romanEffects = new RomanBattleEffects();
    RomanVisuals.addBattleBanners();
  });
} else {
  window.romanEffects = new RomanBattleEffects();
  RomanVisuals.addBattleBanners();
}

console.log('⚔️ Roman Battle Effects loaded');