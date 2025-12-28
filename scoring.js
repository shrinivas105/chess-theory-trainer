export class Scoring {
  static getPlayerEval(e, c) { 
    return c === 'b' ? -e : e; 
  }
  
  static getMoveQuality(t, p) { 
    return p > 0 ? Math.round((t / p) * 100) : 0; 
  }
  
  static getTotalScore(m, t, e) {
    const ms = m * 4 * 0.25;
    const qs = this.getMoveQuality(t, m) * 0.40;
    const es = e < -3 ? 0 : Math.max(0, (e + 3) * 12 * 0.35);
    let b = ms + qs + es;
    let mul = 1, r = '';
    if (e < -3) { 
      mul = 0.3; 
      r = 'Total rout! The legions are shattered, banners fallen, the field lost in disgrace.'; 
    }
    else if (e >= -3 && e < -1.5) { 
      mul = 0.8; 
      r = 'Broken lines! The cohort reels under heavy assault, fighting on but losing ground.'; 
    }
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
      Levy: { 
        icon: "🪓", 
        title: "Levy", 
        msg: r || "Thrown onto the field unblooded — ranks break at first contact.", 
        sub: "Fundamentals missing. Blunders erase all standing." 
      },
      Hastatus: { 
        icon: "🛡️", 
        title: "Hastatus", 
        msg: r || "You held the front line, shield locked, testing the enemy.", 
        sub: "A sound beginning — discipline and precision needed." 
      },
      Principes: { 
        icon: "⚔️", 
        title: "Principes", 
        msg: r || "You fought with order and purpose, pressing where it mattered.", 
        sub: "Strong theory, reliable structure, few weaknesses." 
      },
      Triarius: { 
        icon: "🦅", 
        title: "Triarius", 
        msg: r || "When the battle wavered, you advanced and broke the stalemate.", 
        sub: "Veteran-level command of position and timing." 
      },
      Imperator: { 
        icon: "👑", 
        title: "Imperator", 
        msg: r || "Victory by design — the battlefield bent to your will.", 
        sub: "Flawless theory, flawless execution." 
      }
    };
    return { ...rks[n], score: s, penaltyReason: r };
  }
  
  static getLegionRank(m = 0) {
    const thresholds = [0, 100, 250, 500, 900, 1500];
    const rankOrder = ['Recruit', 'Legionary', 'Optio', 'Centurion', 'Tribunus', 'Legatus'];
    let level = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (m >= thresholds[i]) level = i;
      else break;
    }
    const title = rankOrder[level];
    const iconMap = { 
      Recruit: "🌱", 
      Legionary: "🛡️", 
      Optio: "⚔️", 
      Centurion: "🦅", 
      Tribunus: "🏅", 
      Legatus: "🏆" 
    };
    let nextRank = null, pointsNeeded = 0;
    if (level < rankOrder.length - 1) {
      nextRank = rankOrder[level + 1];
      pointsNeeded = thresholds[level + 1] - m;
    }
    return { 
      title, 
      icon: iconMap[title], 
      merit: m, 
      nextRank, 
      pointsNeeded, 
      rankOrder, 
      thresholds, 
      level 
    };
  }
  
  static getDemotionWarning(rankTitle, recentRanks) {
    if (rankTitle === 'Recruit' || recentRanks.length === 0) return null;
    const levy = recentRanks.filter(r => r === 'Levy').length;
    const hastatus = recentRanks.filter(r => r === 'Hastatus').length;
    const principes = recentRanks.filter(r => r === 'Principes').length;
    
    if (rankTitle === 'Legionary' && levy === 2) 
      return '⚔️ Commander: Legionary, two Levy failures stain your record. One more = <span style="color:#e74c3c">stripped to Recruit!</span>';
    
    if (rankTitle === 'Optio' && levy === 2) 
      return '⚔️ Commander: Optio, two Levies mark your failures. One more Levy or Hastatus = <span style="color:#e74c3c">broken to Legionary!</span>';
    
    if ((rankTitle === 'Centurion' || rankTitle === 'Tribunus') && (levy + hastatus) === 2) 
      return `⚔️ Commander: ${rankTitle}, two weak battles disgrace your eagles. One more = <span style="color:#e74c3c">demoted to Optio!</span>`;
    
    if (rankTitle === 'Legatus' && (levy + hastatus + principes) >= 2) 
      return '⚔️ Commander: Legatus, your recent battles shame the legion. One more weak rank = <span style="color:#e74c3c">stripped of command!</span>';
    
    return null;
  }
}
