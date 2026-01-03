class Scoring {
  static getPlayerEval(e, c) { return c === 'b' ? -e : e; }
  static getMoveQuality(t, p) { return p > 0 ? Math.round((t / p) * 100) : 0; }
  
  static getTotalScore(m, t, e) {
    const ms = m * 4 * 0.25;
    const qs = this.getMoveQuality(t, m) * 0.40;
    const es = e < -3 ? 0 : Math.max(0, (e + 3) * 12 * 0.35);
    let b = ms + qs + es;
    let mul = 1, r = '';
    if (e < -3) { mul = 0.3; r = 'Total rout! The legions are shattered, banners fallen, the field lost in disgrace.'; }
    else if (e >= -3 && e < -1.5) { mul = 0.8; r = 'Broken lines! The cohort reels under heavy assault, fighting on but losing ground.'; }
    const s = Math.min(Math.round(b * mul), mul === 0.3 ? 30 : mul === 0.8 ? 60 : 100);
    return { score: s, penaltyReason: r };
  }
  
  static getBattleRank(s, e, r) {
    const t = [85, 70, 55, 40];
    let n;
    if (e <= -3) n = 'Levy';
    else if (e < -1.5) n = s >= t[3] ? 'Hastatus' : 'Levy';
    else n = s >= t[0] ? 'Imperator' : s >= t[1] ? 'Triarius' : s >= t[2] ? 'Principes' : s >= t[3] ? 'Hastatus' : 'Levy';
    const rks = {
      Levy: { icon: "🪖", title: "Levy", msg: r || "Thrown onto the field unblooded — ranks break at first contact.", sub: "Fundamentals missing. Blunders erase all standing." },
      Hastatus: { icon: "🛡️", title: "Hastatus", msg: r || "You held the front line, shield locked, testing the enemy.", sub: "A sound beginning — discipline and precision needed." },
      Principes: { icon: "⚔️", title: "Principes", msg: r || "You fought with order and purpose, pressing where it mattered.", sub: "Strong theory, reliable structure, few weaknesses." },
      Triarius: { icon: "🦅", title: "Triarius", msg: r || "When the battle wavered, you advanced and broke the stalemate.", sub: "Veteran-level command of position and timing." },
      Imperator: { icon: "👑", title: "Imperator", msg: r || "Victory by design — the battlefield bent to your will.", sub: "Flawless theory, flawless execution." }
    };
    return { ...rks[n], score: s, penaltyReason: r };
  }
  
  static getLegionRank(m = 0) {
    const thresholds = [0, 200, 500, 900, 1300, 1750];
    const rankOrder = ['Recruit', 'Legionary', 'Optio', 'Centurion', 'Tribunus', 'Legatus'];
    let level = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (m >= thresholds[i]) level = i;
      else break;
    }
    const title = rankOrder[level];
    const iconMap = { Recruit: "🌱", Legionary: "🛡️", Optio: "⚔️", Centurion: "🦅", Tribunus: "🏅", Legatus: "🏆" };
    let nextRank = null, pointsNeeded = 0;
    if (level < rankOrder.length - 1) {
      nextRank = rankOrder[level + 1];
      pointsNeeded = thresholds[level + 1] - m;
    }
    return { title, icon: iconMap[title], merit: m, nextRank, pointsNeeded, rankOrder, thresholds, level };
  }
  
  static getDemotionWarning(rankTitle, recentRanks) {
    if (rankTitle === 'Recruit' || recentRanks.length === 0) return null;
    
    const levy = recentRanks.filter(r => r === 'Levy').length;
    const hastatus = recentRanks.filter(r => r === 'Hastatus').length;
    const triarius = recentRanks.filter(r => r === 'Triarius').length;
    const imperator = recentRanks.filter(r => r === 'Imperator').length;
    const eliteCount = triarius + imperator;
    const battlesPlayed = recentRanks.length;
    const battlesLeft = 5 - battlesPlayed;
    
    // Legionary: Warning after 1 Levy
    if (rankTitle === 'Legionary' && levy === 1) {
      return '⚔️ Commander: Legionary, one Levy failure stains your record. One more = <span style="color:#e74c3c">stripped to Recruit!</span>';
    }
    
    // Optio: Warning after 1 Levy OR 1 Hastatus
    if (rankTitle === 'Optio' && (levy === 1 || hastatus === 1)) {
      return '⚔️ Commander: Optio, one weak battle marks your failure. One more Levy or Hastatus = <span style="color:#e74c3c">broken to Legionary!</span>';
    }
    
    // Centurion: Need at least 1 Triarius/Imperator in last 5
    if (rankTitle === 'Centurion') {
      if (battlesPlayed >= 4 && eliteCount === 0) {
        return '⚔️ Commander: Centurion, you have shown no excellence! Score Triarius or Imperator in the last battle or be <span style="color:#e74c3c">demoted to Optio!</span>';
      }
    }
    
    // Tribunus: Need at least 3 Triarius/Imperator in last 5
    if (rankTitle === 'Tribunus') {
      const neededElite = 3 - eliteCount;
      
      // Progressive warnings based on how many battles played
      if (neededElite > 0) {
        // After 1 battle with no elite
        if (battlesPlayed === 1 && eliteCount === 0) {
          return '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">3 Triarius or Imperator</span> in your next 4 battles to maintain rank!';
        }
        
        // After 2 battles with <1 elite
        if (battlesPlayed === 2 && eliteCount < 1) {
          return '⚔️ Commander: Tribunus, you MUST score <span style="color:#e74c3c">3 Triarius or Imperator</span> in your next 3 battles or face demotion to Centurion!';
        }
        
        // After 3 battles - show warning based on what's needed
        if (battlesPlayed === 3) {
          if (neededElite === 3) {
            // 0 elite so far - mathematically impossible, will be demoted
            return '⚔️ Commander: Tribunus, <span style="color:#e74c3c">IMPOSSIBLE</span> to score 3 elite in 2 battles! Demotion imminent!';
          } else if (neededElite === 2) {
            // 1 elite so far - need 2 more in 2 battles
            return '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">2 more Triarius/Imperator</span> in your last 2 battles or be demoted to Centurion!';
          } else if (neededElite === 1) {
            // 2 elite so far - need 1 more
            return '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">1 more Triarius/Imperator</span> in your last 2 battles to maintain rank!';
          }
        }
        
        // After 4 battles - final warning
        if (battlesPlayed === 4) {
          if (neededElite >= 2) {
            // Need 2+ in 1 battle - impossible
            return '⚔️ Commander: Tribunus, <span style="color:#e74c3c">IMPOSSIBLE</span> to secure required elite battles! Demotion imminent!';
          } else if (neededElite === 1) {
            // Need exactly 1 more
            return '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator</span> in the last battle to maintain your rank or face demotion to Centurion!';
          }
        }
      }
    }
    
    return null;
  }
  
  // New method to check if demotion should occur
  static checkDemotion(rankTitle, recentRanks, newBattleRank) {
    if (rankTitle === 'Recruit') return null;
    
    const levy = recentRanks.filter(r => r === 'Levy').length;
    const hastatus = recentRanks.filter(r => r === 'Hastatus').length;
    const triarius = recentRanks.filter(r => r === 'Triarius').length;
    const imperator = recentRanks.filter(r => r === 'Imperator').length;
    const eliteCount = triarius + imperator;
    
    // Legionary: 2 Levy → Recruit
    if (rankTitle === 'Legionary' && levy >= 2) {
      return {
        demote: true,
        newRank: 'Recruit',
        newMerit: 0,
        message: '⚔️ Commander: Two Levy failures! You are stripped to Recruit! Prove your worth again!'
      };
    }
    
    // Optio: 2 Levy OR 2 Hastatus OR (1 Levy + 1 Hastatus) → Legionary
    if (rankTitle === 'Optio' && (levy >= 2 || hastatus >= 2 || (levy >= 1 && hastatus >= 1))) {
      return {
        demote: true,
        newRank: 'Legionary',
        newMerit: 200,
        message: '⚔️ Commander: Repeated weak battles! You are broken to Legionary! Rise or perish!'
      };
    }
    
    // Centurion: ANY Levy or Hastatus → immediate demotion
    if (rankTitle === 'Centurion' && (newBattleRank === 'Levy' || newBattleRank === 'Hastatus')) {
      return {
        demote: true,
        newRank: 'Optio',
        newMerit: 500,
        message: '⚔️ Commander: A Centurion showing such weakness! You are demoted to Optio! Disgraceful!'
      };
    }
    
    // Centurion: No Triarius/Imperator after 5 battles → demotion
    if (rankTitle === 'Centurion' && recentRanks.length >= 5 && eliteCount === 0) {
      return {
        demote: true,
        newRank: 'Optio',
        newMerit: 500,
        message: '⚔️ Commander: Five battles without excellence! You are demoted to Optio! Unacceptable!'
      };
    }
    
    // Tribunus: ANY Levy or Hastatus → immediate demotion
    if (rankTitle === 'Tribunus' && (newBattleRank === 'Levy' || newBattleRank === 'Hastatus')) {
      return {
        demote: true,
        newRank: 'Centurion',
        newMerit: 900,
        message: '⚔️ Commander: A Tribunus falling to such depths! You are stripped to Centurion! Shameful!'
      };
    }
    
    // Tribunus: Mathematical impossibility - can't get 3 elite in remaining battles
    if (rankTitle === 'Tribunus') {
      const battlesLeft = 5 - recentRanks.length;
      const neededElite = 3 - eliteCount;
      
      if (neededElite > battlesLeft) {
        return {
          demote: true,
          newRank: 'Centurion',
          newMerit: 900,
          message: '⚔️ Commander: You cannot achieve the required excellence! You are demoted to Centurion!'
        };
      }
    }
    
    return null;
  }
  
  // New method to check if promotion requirements are met
  static canPromote(currentRank, merit, recentRanks) {
    const thresholds = [0, 200, 500, 900, 1300, 1750];
    const rankOrder = ['Recruit', 'Legionary', 'Optio', 'Centurion', 'Tribunus', 'Legatus'];
    const currentLevel = rankOrder.indexOf(currentRank);
    
    if (currentLevel >= 5) return true; // Already at max
    
    const nextLevel = currentLevel + 1;
    const nextRank = rankOrder[nextLevel];
    const nextThreshold = thresholds[nextLevel];
    
    // Check if merit threshold is met
    if (merit < nextThreshold) return false;
    
    // Centurion promotion: Need at least 1 Triarius/Imperator
    if (nextRank === 'Tribunus') {
      const triarius = recentRanks.filter(r => r === 'Triarius').length;
      const imperator = recentRanks.filter(r => r === 'Imperator').length;
      if ((triarius + imperator) < 1) return false;
    }
    
    // Tribunus promotion: Need at least 3 Triarius/Imperator
    if (nextRank === 'Legatus') {
      const triarius = recentRanks.filter(r => r === 'Triarius').length;
      const imperator = recentRanks.filter(r => r === 'Imperator').length;
      if ((triarius + imperator) < 3) return false;
    }
    
    return true;
  }
}