import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxnnexvdqnwrteyaggai.supabase.co';
const supabaseKey = 'your-anon-key-here'; // Replace with your actual anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
// js/supabase-client.js
// DO NOT add any <script> tag or import here — library is already loaded in index.html

// Use your real keys (or leave placeholders for now — app works without them)
const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';     // Replace later
const supabaseAnonKey = 'sb_publishable_ko82rLYQ9J0ShEoV4JT2KQ_Y3gt5Mx5';                   // Replace later

// Use the global Supabase object from the CDN
const supabase = Supabase.createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
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
  if (error && error.code !== 'PGRST116') console.error('Load error:', error);
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
