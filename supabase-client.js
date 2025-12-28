// js/supabase-client.js
// This file uses the global Supabase library loaded from CDN in index.html
// No imports or script tags needed

// === YOUR SUPABASE PROJECT CREDENTIALS ===
const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';  // Your real Project URL
const supabaseAnonKey = 'sb_publishable_ko82rLYQ9J0ShEoV4JT2KQ_Y3gt5Mx5';  // Your real publishable anon key

// Create Supabase client with session persistence enabled
const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,           // Save session in localStorage
    storageKey: 'ChessTheoryAuth', // Unique key to avoid conflicts
    autoRefreshToken: true,         // Automatically refresh expired tokens
    detectSessionInUrl: true        // Handle redirect after Google login
  }
});

// Helper: Get current user
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Sign in with Google
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) console.error('Sign in error:', error);
}

// Sign out
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}

// Load progress from Supabase (returns null if no data or not logged in)
async function loadProgress() {
  const user = await getUser();
  if (!user) {
    console.log('No user logged in for loadProgress');
    return null;
  }

  const { data, error } = await supabase
    .from('player_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('No progress row yet for this user — normal on first login');
    } else {
      console.error('Supabase load error:', error);
    }
    return null;
  }

  console.log('Successfully loaded cloud progress:', data);
  return data;
}

// Save progress to Supabase (only if logged in)
async function saveProgress(progress) {
  const user = await getUser();
  if (!user) {
    console.log('No user logged in — skipping cloud save');
    return;
  }

  const payload = {
    user_id: user.id,
    ...progress,
    updated_at: new Date().toISOString()  // Optional timestamp
  };

  const { error } = await supabase
    .from('player_progress')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('Supabase save error:', error);
  } else {
    console.log('Progress successfully saved to cloud:', payload);
  }
}