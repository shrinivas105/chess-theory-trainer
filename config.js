// config.js - Scoring Configuration
// Easy-to-modify constants for testing optimal weightages

// ========================================
// QUALITY TRACKING SETTINGS
// ========================================
const SKIP_QUALITY_MOVES = 4;  // Skip quality check for first N player moves (opening book moves)

// ========================================
// ACCURACY BONUS THRESHOLDS
// Hidden bonus for maintaining high quality over longer battles
// Only awarded when final eval >= +0.5
// ========================================
const ACCURACY_BONUS = {
  minQuality: 90,      // Minimum quality percentage required (90%)
  minEval: 0.5,        // Minimum evaluation required (+0.5 or better)
  tiers: [
    { minMoves: 12, maxMoves: 15, bonus: 2, name: 'Tactical Precision' },
    { minMoves: 16, maxMoves: 20, bonus: 4, name: 'Strategic Mastery' },
    { minMoves: 21, maxMoves: Infinity, bonus: 6, name: 'Legendary Discipline' }
  ]
};

// ========================================
// MASTER CAMPAIGN WEIGHTS
// ========================================
const MASTER_WEIGHTS = {
  moves: 0.25,        // 25% - Number of moves played
  quality: 0.40,      // 40% - Move quality (top 3 choices)
  evaluation: 0.35,   // 35% - Final position evaluation
  movesMultiplier: 4, // Points per move (moves × 4)
  evalMultiplier: 12  // Evaluation scaling ((eval + 3) × 12)
};

// ========================================
// CLUB CAMPAIGN WEIGHTS
// ========================================
const CLUB_WEIGHTS = {
  moves: 0.30,        // 30% - Number of moves played (more weight)
  quality: 0.35,      // 35% - Move quality (less strict)
  evaluation: 0.35,   // 35% - Final position evaluation
  movesMultiplier: 4, // Points per move (moves × 4)
  evalMultiplier: 12  // Evaluation scaling ((eval + 3) × 12)
};

// ========================================
// MASTER CAMPAIGN - PENALTY MULTIPLIERS
// Applied to total score based on final position
// ========================================
const MASTER_PENALTY_MULTIPLIERS = {
  catastrophic: 0.3,  // eval ≤ -3 (70% penalty, max 30 points)
  poor: 0.8,          // -3 < eval < -1.5 (20% penalty, max 60 points)
  acceptable: 1.0     // eval ≥ -1.5 (no penalty, max 100 points)
};

// ========================================
// CLUB CAMPAIGN - PENALTY MULTIPLIERS
// Applied to total score based on final position
// ========================================
const CLUB_PENALTY_MULTIPLIERS = {
  catastrophic: 0.4,  // eval ≤ -3 (60% penalty, max 40 points) - more forgiving
  poor: 0.85,         // -3 < eval < -1.5 (15% penalty, max 65 points) - more forgiving
  acceptable: 1.0     // eval ≥ -1.5 (no penalty, max 100 points)
};

// ========================================
// MASTER CAMPAIGN - EVALUATION THRESHOLDS
// Used to determine penalty multipliers
// ========================================
const MASTER_EVAL_THRESHOLDS = {
  catastrophic: -3,   // Total rout - shattered position
  poor: -1.5          // Broken lines - losing ground
};

// ========================================
// CLUB CAMPAIGN - EVALUATION THRESHOLDS
// Used to determine penalty multipliers
// ========================================
const CLUB_EVAL_THRESHOLDS = {
  catastrophic: -3.5, // Total rout - more lenient (harder to trigger)
  poor: -2.0          // Broken lines - more lenient
};

// ========================================
// BATTLE RANK THRESHOLDS (Same for both campaigns)
// Score ranges for each battle rank
// ========================================
const BATTLE_RANK_THRESHOLDS = {
  imperator: 85,   // 85-100
  triarius: 70,    // 70-84
  principes: 55,   // 55-69
  hastatus: 40,    // 40-54
  levy: 0          // 0-39
};

// ========================================
// TESTING PRESETS
// Uncomment to quickly test different configurations
// ========================================

// // PRESET 1: Much Harder Master (emphasize quality even more)
// MASTER_WEIGHTS.moves = 0.20;
// MASTER_WEIGHTS.quality = 0.50;
// MASTER_WEIGHTS.evaluation = 0.30;
// MASTER_PENALTY_MULTIPLIERS.catastrophic = 0.2;  // 80% penalty
// MASTER_PENALTY_MULTIPLIERS.poor = 0.7;          // 30% penalty

// // PRESET 2: Much Easier Club (reward playing more moves)
// CLUB_WEIGHTS.moves = 0.35;
// CLUB_WEIGHTS.quality = 0.30;
// CLUB_WEIGHTS.evaluation = 0.35;
// CLUB_WEIGHTS.movesMultiplier = 5; // More points per move
// CLUB_PENALTY_MULTIPLIERS.catastrophic = 0.5;  // 50% penalty
// CLUB_PENALTY_MULTIPLIERS.poor = 0.9;          // 10% penalty

// // PRESET 3: Balanced (same difficulty for both)
// CLUB_WEIGHTS = {...MASTER_WEIGHTS};
// CLUB_PENALTY_MULTIPLIERS = {...MASTER_PENALTY_MULTIPLIERS};
// CLUB_EVAL_THRESHOLDS = {...MASTER_EVAL_THRESHOLDS};

// // PRESET 4: Very Lenient Club Thresholds
// CLUB_EVAL_THRESHOLDS.catastrophic = -4.5;  // Only -4.5 or worse is catastrophic
// CLUB_EVAL_THRESHOLDS.poor = -2.5;          // -2.5 to -4.5 is poor