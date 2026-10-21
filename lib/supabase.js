import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If the two environment variables are missing the app shows a friendly
// setup screen instead of crashing (see components/AuthProvider.js).
export const isConfigured = Boolean(url && key);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key'
);
