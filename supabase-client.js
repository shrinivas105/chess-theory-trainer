// js/supabase-client.js
// Fixed: Complete OAuth flow with proper error handling

const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bm13eWNucmtsdGNlY2hpaGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDk5MjEsImV4cCI6MjA1MDk4NTkyMX0.CEdveFq79zyZ6u2bpGsP2wRi0jYtI0v4gDCNgjkZ9Fw';

// Helper to get the correct URL (browser-safe)
function getURL() {
  // Use window.location for browser environment
  let url = window.location.origin;
  
  // Make sure to include trailing /
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
}

// Only create client if it doesn't exist
if (typeof window.supabaseClient === 'undefined') {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'chess-theory-supabase-auth',
      flowType: 'implicit'
    }
  });
  console.log('✓ Supabase client initialized');
}

// Helper functions
async function getUser() {
  try {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
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
    const redirectUrl = getURL();
    console.log('🔐 Starting Google sign-in, will redirect to:', redirectUrl);
    
    // Clear any existing error state
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });
    
    if (error) {
      console.error('❌ OAuth initiation error:', error);
      throw error;
    }
    
    console.log('✓ Google sign-in initiated, redirecting...');
    return { success: true };
  } catch (e) {
    console.error('❌ Sign in error:', e);
    
    // Show user-friendly error
    let errorMsg = 'Sign in failed. ';
    if (e.message.includes('redirect')) {
      errorMsg += 'Redirect URL not configured. Check Supabase dashboard.';
    } else if (e.message.includes('provider')) {
      errorMsg += 'Google provider not enabled. Check Supabase dashboard.';
    } else {
      errorMsg += e.message;
    }
    
    alert(errorMsg);
    return { success: false, error: e.message };
  }
}

async function signOut() {
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    console.log('✓ Signed out successfully');
    
    // Clear local storage
    localStorage.removeItem('chess-theory-supabase-auth');
    
    // Reload page
    window.location.reload();
  } catch (e) {
    console.error('Sign out error:', e);
    // Force reload anyway
    window.location.reload();
  }
}

async function loadProgress() {
  try {
    const user = await getUser();
    if (!user) return null;
    
    const { data, error } = await window.supabaseClient
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
    
    const { error } = await window.supabaseClient
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

// Debug helper - log any OAuth errors in URL
(function checkOAuthErrors() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  
  if (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Description:', errorDescription);
    alert(`Login failed: ${errorDescription || error}`);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();