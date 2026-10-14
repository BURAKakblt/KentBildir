import { createClient } from '@supabase/supabase-js';
import type { Config } from '../config.js';
export function createSupabase(config: Config) { return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }); }
export type Supabase = ReturnType<typeof createSupabase>;
