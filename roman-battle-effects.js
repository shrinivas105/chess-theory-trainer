// roman-battle-effects.js - Performance optimized version
// ALL ANIMATIONS REMOVED - SOUNDS ONLY

class RomanBattleEffects {
  constructor() {
    // No visual effects initialization - performance optimized
  }

  init() {
    // No animations - sounds only
  }

  // Battle sound effects (KEPT)
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
    console.log('🎺 Legion promoted!');
  }
}

// Visual enhancements disabled for performance
const RomanVisuals = {
  addBattleBanners() {},
  addHelmetDecoration(element) {},
  highlightPossibleMoves(game, square) {},
  clearMoveIndicators() {},
  createCaptureEffect(square) {}
};

// Initialize minimal effects (sounds only)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.romanEffects = new RomanBattleEffects();
  });
} else {
  window.romanEffects = new RomanBattleEffects();
}
