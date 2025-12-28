// supabase-client.js
// Uses global Supabase from CDN

const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';
const supabaseAnonKey = 'sb_publishable_ko82rLYQ9J0ShEoV4JT2KQ_Y3gt5Mx5';

const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'ChessTheoryAuth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) console.error('Sign-in error:', error);
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign-out error:', error);
}

async function loadProgress() {
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
  return data;
}

async function saveProgress(progress) {
  const user = await getUser();
  if (!user) return;

  const payload = { user_id: user.id, ...progress, updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from('player_progress')
    .upsert(payload);

  if (error) console.error('Save error:', error);
  else console.log('Saved to cloud:', payload);
}