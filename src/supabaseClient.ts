import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nnqlatomkurgopyrrjwt.supabase.co';
const supabaseAnonKey = 'sb_publishable_csDizZSmHS8fbhayFwRN3g__aRC35-O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
