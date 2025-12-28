// js/supabase-client.js
// Fixed: Prevents duplicate declarations and adds proper session persistence

const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bm13eWNucmtsdGNlY2hpaGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDk5MjEsImV4cCI6MjA1MDk4NTkyMX0.CEdveFq79zyZ6u2bpGsP2wRi0jYtI0v4gDCNgjkZ9Fw';

// Only create client if it doesn't exist (prevents duplicate declaration error)
if (typeof window.supabaseClient === 'undefined') {
  window.supabaseClient = Supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'chess-theory-supabase-auth',
      flowType: 'pkce'
    }
  });
  console.log('✓ Supabase client initialized');
}

// Use window.supabaseClient everywhere to avoid redeclaration
const supabase = window.supabaseClient;

// Helper functions with better error handling
async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('getUser error:', error);
      return null;
    }
    return user;
  } catch (e) {
    console.error('getUser exception:', e);
    return null;
  }
}

async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) throw error;
    console.log('✓ Google sign-in initiated');
    return { success: true };
  } catch (e) {
    console.error('Sign in error:', e);
    alert('Sign in failed: ' + e.message);
    return { success: false, error: e.message };
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('✓ Signed out successfully');
  } catch (e) {
    console.error('Sign out error:', e);
  }
}

async function loadProgress() {
  try {
    const user = await getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('player_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Load error:', error);
      return null;
    }
    
    console.log('✓ Progress loaded from cloud');
    return data;
  } catch (e) {
    console.error('loadProgress exception:', e);
    return null;
  }
}

async function saveProgress(progress) {
  try {
    const user = await getUser();
    if (!user) {
      console.log('Not logged in - skipping cloud save');
      return;
    }
    
    const { error } = await supabase
      .from('player_progress')
      .upsert({ 
        user_id: user.id, 
        ...progress,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Save error:', error);
    } else {
      console.log('✓ Progress saved to cloud');
    }
  } catch (e) {
    console.error('saveProgress exception:', e);
  }
}