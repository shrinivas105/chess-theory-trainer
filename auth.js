// auth.js - Handles all authentication and progress sync logic
// Fixed: Better OAuth redirect handling and error recovery

class AuthModule {
  constructor(app) {
    this.app = app;
    this.user = null;
    this.isLoggedIn = false;
    this.authInitialized = false;
  }

  async initialize() {
    try {
      // Get supabase client from window
      const supabase = window.supabaseClient;
      
      if (!supabase) {
        console.error('Supabase client not found!');
        this.authInitialized = true;
        return false;
      }

      // Set up listener FIRST
      this.setupAuthListener();
      
      // Check for OAuth errors in URL
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (error) {
        console.error('OAuth error:', error, errorDescription);
        alert(`Sign in failed: ${errorDescription || error}`);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Then check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session check error:', sessionError);
      }
      
      if (session && session.user) {
        this.user = session.user;
        this.isLoggedIn = true;
        console.log('✓ User session found:', this.user.email);
        
        // Clean URL if coming from OAuth redirect
        if (urlParams.has('code') || urlParams.has('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        await this.loadCloudProgress();
      } else {
        console.log('No active session - using local storage');
      }
      
      this.authInitialized = true;
      return true;
    } catch (e) {
      console.error('Auth initialization error:', e);
      this.authInitialized = true;
      return false;
    }
  }

  setupAuthListener() {
    const supabase = window.supabaseClient;
    
    if (!supabase) {
      console.error('Cannot setup auth listener - supabase client not found');
      return;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email || 'no user');
      
      const wasLoggedIn = this.isLoggedIn;
      this.user = session?.user ?? null;
      this.isLoggedIn = !!this.user;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!wasLoggedIn) {
          console.log('✓ User signed in, loading cloud data...');
          await this.loadCloudProgress();
          this.app.render();
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('✓ User signed out');
        this.app.render();
      } else if (event === 'USER_UPDATED') {
        console.log('✓ User updated');
      }
    });
  }

  async loadCloudProgress() {
    try {
      const progress = await loadProgress();
      if (progress) {
        console.log('✓ Cloud progress loaded:', progress);
        
        // Update app state with cloud data
        this.app.legionMerits = {
          master_merit: progress.master_merit || 0,
          lichess_merit: progress.lichess_merit || 0
        };
        this.app.gamesPlayed = progress.games_played || 0;
        this.app.recentBattleRanksMaster = progress.recent_battle_ranks_master || [];
        this.app.recentBattleRanksLichess = progress.recent_battle_ranks_lichess || [];

        // Sync to localStorage as backup
        this.app.saveToLocalStorage();
      } else {
        console.log('No cloud progress found, uploading local data...');
        await this.saveCloudProgress();
      }
    } catch (e) {
      console.error('Error loading cloud progress:', e);
    }
  }

  async saveCloudProgress() {
    if (!this.isLoggedIn) {
      console.log('Not logged in - skipping cloud save');
      return;
    }

    const progress = {
      master_merit: this.app.legionMerits.master_merit || 0,
      lichess_merit: this.app.legionMerits.lichess_merit || 0,
      games_played: this.app.gamesPlayed,
      recent_battle_ranks_master: this.app.recentBattleRanksMaster,
      recent_battle_ranks_lichess: this.app.recentBattleRanksLichess
    };

    await saveProgress(progress);
  }

  async handleSignOut() {
    await signOut();
    this.user = null;
    this.isLoggedIn = false;
    this.app.render();
  }

  renderAuthSection() {
    if (this.isLoggedIn) {
      return `
        <div style="text-align:center;margin:20px 0;">
          <strong>✓ Synced as ${this.user.email.split('@')[0]}</strong><br>
          <button class="btn" style="margin-top:8px;" onclick="app.auth.handleSignOut()">
            Sign Out
          </button>
        </div>
      `;
    } else {
      return `
        <div style="text-align:center;margin:20px 0;">
          <button class="btn" onclick="signInWithGoogle()">
            🔐 Sign in with Google to sync across devices
          </button>
          <p style="font-size:0.8rem;color:#aaa;margin-top:10px;">
            No account needed – progress is saved locally and works instantly!
          </p>
        </div>
      `;
    }
  }
}