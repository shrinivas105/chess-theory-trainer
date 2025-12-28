// === REPLACE WITH YOUR OWN SUPABASE VALUES ===
const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';     // ← Your project URL
const supabaseAnonKey = 'sb_publishable_ko82rLYQ9J0ShEoV4JT2KQ_Y3gt5Mx5';               // ← From Settings > API

const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey);

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

async function signOut() {
  await supabase.auth.signOut();
}

async function loadProgress() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('player_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {  // no row = not an error
    console.error('Load error:', error);
  }
  return data;
}

async function saveProgress(progress) {
  const user = await getUser();
  if (!user) return;

  const { error } = await supabase
    .from('player_progress')
    .upsert({ user_id: user.id, ...progress });

  if (error) console.error('Save error:', error);
}