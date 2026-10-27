import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function memoryAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Photo processing is unavailable. You can still enter and save cards manually.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
