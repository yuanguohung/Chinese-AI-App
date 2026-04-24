import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export const getSupabase = (url, key) => {
  if (!url || !key) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};
