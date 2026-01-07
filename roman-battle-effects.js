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
  
  static playMenuFanfare() {
    try {
      const audio = new Audio('fanfare.mp3');  // Your new sound file
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Fanfare failed:', e));
      console.log('🎺 Fanfare for the legions!');
    } catch (e) {
      console.log('Fanfare error:', e);
    }
  }

  static playAmbientLoop() {
    try {
      const audio = new Audio('roman-ambient.mp3');
      audio.volume = 0.2;
      audio.loop = true;  // Loops forever
      audio.play().catch(e => console.log('Ambient loop failed:', e));
      console.log('🌿 Ambient Roman sounds playing');
    } catch (e) {
      console.log('Ambient error:', e);
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
