import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_project_url_here';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For backward compatibility, export these as undefined to prevent errors during transition
export const db = null;
export const storage = null;
export const auth = null;
export default null;