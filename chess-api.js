// chess-api.js - Updated & Fixed Version (January 2026)

const pieces = {
  wp: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  wr: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  wn: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  wb: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  wq: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  wk: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
  bp: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
  br: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
  bn: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
  bb: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
  bq: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
  bk: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg"
};

class ChessAPI {
  static cache = {};
  static activeControllers = new Map(); // Track active requests

  static async queryExplorer(source, fen, retryCount = 0) {
    const key = `${source}_${fen}`;
    if (this.cache[key]) return this.cache[key];

    const controllerKey = `explorer_${source}`;
    if (this.activeControllers.has(controllerKey)) {
      this.activeControllers.get(controllerKey).abort();
      this.activeControllers.delete(controllerKey);
    }

    let url = source === 'master' ? 'https://explorer.lichess.ovh/masters' : 'https://explorer.lichess.ovh/lichess';
    url += `?variant=standard&fen=${encodeURIComponent(fen)}&topGames=0&moves=5`;
    if (source === 'lichess') url += '&ratings=1600,1800,2000,2200,2500';

    const controller = new AbortController();
    this.activeControllers.set(controllerKey, controller);

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000); // Increased to 15 seconds

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      this.activeControllers.delete(controllerKey);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited by Lichess (429) - retrying in 60s...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return this.queryExplorer(source, fen, retryCount); // retry once after wait
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.cache[key] = data;
      return data;
    } catch (e) {
      clearTimeout(timeout);
      this.activeControllers.delete(controllerKey);

      if (e.name === 'AbortError') {
        console.log(`🔄 Explorer request timed out for ${source} (attempt ${retryCount + 1}/2)`);

        // Retry once on timeout
        if (retryCount < 1) {
          return this.queryExplorer(source, fen, retryCount + 1);
        }

        console.log(`❌ No retry left - using fallback for ${source}`);
      } else {
        console.warn('Explorer failed (non-abort):', e);
      }

      // Fallback data - prevents game from ending prematurely
      return { white: 0, draws: 0, black: 0, moves: [] };
    }
  }

  static async queryGames(source, fen, retryCount = 0) {
    const controllerKey = `games_${source}`;
    if (this.activeControllers.has(controllerKey)) {
      this.activeControllers.get(controllerKey).abort();
      this.activeControllers.delete(controllerKey);
    }

    const base = source === 'master' ? 'masters' : 'lichess';
    let url = `https://explorer.lichess.ovh/${base}?variant=standard&fen=${encodeURIComponent(fen)}`;
    if (source === 'master') url += '&topGames=4';
    else url += '&recentGames=4&ratings=1600,1800,2000,2200,2500';

    const controller = new AbortController();
    this.activeControllers.set(controllerKey, controller);

    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      this.activeControllers.delete(controllerKey);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Games query rate limited - waiting 60s...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return this.queryGames(source, fen, retryCount);
        }
        return { topGames: [], recentGames: [] };
      }

      const data = await response.json();
      return { topGames: data.topGames || [], recentGames: data.recentGames || [] };
    } catch (e) {
      clearTimeout(timeout);
      this.activeControllers.delete(controllerKey);

      if (e.name === 'AbortError' && retryCount < 1) {
        console.log(`🔄 Games request timed out - retrying once...`);
        return this.queryGames(source, fen, retryCount + 1);
      }

      if (e.name !== 'AbortError') {
        console.warn('Games query failed:', e);
      }

      return { topGames: [], recentGames: [] };
    }
  }

  static async getEvaluation(fen, cache = {}) {
    if (cache[fen] !== undefined) return cache[fen];

    const controllerKey = `eval_${fen}`;
    if (this.activeControllers.has(controllerKey)) {
      this.activeControllers.get(controllerKey).abort();
      this.activeControllers.delete(controllerKey);
    }

    try {
      const controller = new AbortController();
      this.activeControllers.set(controllerKey, controller);

      const timeout = setTimeout(() => controller.abort(), 12000); // 12s for cloud eval

      const encodedFen = encodeURIComponent(fen);
      const response = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}&multiPv=1`, {
        signal: controller.signal
      });

      clearTimeout(timeout);
      this.activeControllers.delete(controllerKey);

      if (response.ok) {
        const data = await response.json();
        if (data.pvs && data.pvs.length > 0) {
          const pv = data.pvs[0];
          let evalValue = pv.mate !== undefined
            ? (pv.mate > 0 ? 100 : -100) // Mate in X
            : (pv.cp / 100 || 0);

          // Flip eval if black to move
          if (fen.split(' ')[1] === 'b') evalValue = -evalValue;

          cache[fen] = evalValue;
          return evalValue;
        }
      }
    } catch (e) {
      this.activeControllers.delete(controllerKey);
      if (e.name !== 'AbortError') {
        console.log('Cloud evaluation unavailable:', e.message || e);
      }
    }

    // Fallback to 0 if unavailable
    return 0;
  }

  // Clean up all pending requests (call when resetting game)
  static cancelAllRequests() {
    for (const [key, controller] of this.activeControllers.entries()) {
      controller.abort();
      console.log(`🛑 Cancelled pending request: ${key}`);
    }
    this.activeControllers.clear();
  }
}