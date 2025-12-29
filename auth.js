// auth.js - Handles all authentication and progress sync logic
// Fixed: Better OAuth redirect handling, error recovery, and database operations

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

      console.log('🔄 Initializing auth...');

      // Set up listener FIRST
      this.setupAuthListener();
      
      // Check for OAuth errors in URL
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      console.log('🔍 URL query params:', urlParams.toString());
      console.log('🔍 URL hash params:', hashParams.toString());
      console.log('🔍 Full URL:', window.location.href);
      
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
      
      if (error) {
        console.error('❌ OAuth error in URL:', error, errorDescription);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Then check current session
      console.log('🔍 Checking for existing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('📦 Session data:', session ? 'Session found' : 'No session', sessionError);
      
      if (sessionError) {
        console.error('❌ Session check error:', sessionError);
      }
      
      if (session && session.user) {
        this.user = session.user;
        this.isLoggedIn = true;
        console.log('✅ USER LOGGED IN:', this.user.email);
        
        // Clean URL if coming from OAuth redirect
        if (urlParams.has('code') || urlParams.has('access_token')) {
          console.log('🔄 Cleaning OAuth params from URL');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        await this.loadCloudProgress();
      } else {
        console.log('ℹ️ No active session - using local storage');
      }
      
      this.authInitialized = true;
      return true;
    } catch (e) {
      console.error('❌ Auth initialization error:', e);
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
          console.log('✓ Cloud data loaded, rendering app...');
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
      console.log('📥 Attempting to load cloud progress...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 10000)
      );
      
      const progress = await Promise.race([
        loadProgress(),
        timeoutPromise
      ]);
      
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
        console.log('ℹ️ No cloud progress found, uploading local data...');
        await this.saveCloudProgress();
      }
    } catch (e) {
      console.error('❌ Error loading cloud progress:', e);
      console.log('⚠️ Continuing with local data...');
      // Don't block the app - continue with local storage data
    }
  }

  async saveCloudProgress() {
    if (!this.isLoggedIn) {
      console.log('ℹ️ Not logged in - skipping cloud save');
      return;
    }

    try {
      console.log('💾 Preparing to save cloud progress...');
      
      const progress = {
        master_merit: this.app.legionMerits.master_merit || 0,
        lichess_merit: this.app.legionMerits.lichess_merit || 0,
        games_played: this.app.gamesPlayed,
        recent_battle_ranks_master: this.app.recentBattleRanksMaster,
        recent_battle_ranks_lichess: this.app.recentBattleRanksLichess
      };

      const result = await saveProgress(progress);
      
      if (result && result.success) {
        console.log('✓ Cloud save successful');
      } else {
        console.warn('⚠️ Cloud save had issues:', result);
      }
    } catch (e) {
      console.error('❌ Error in saveCloudProgress:', e);
    }
  }

  async handleSignIn() {
    console.log('🔐 Sign in button clicked');
    await signInWithGoogle();
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
          <button class="btn" onclick="app.auth.handleSignIn()">
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