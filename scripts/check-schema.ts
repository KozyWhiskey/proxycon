import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

// Use the service role key if available for DDL operations, otherwise try anon (might fail depending on RLS/Postgres config)
// For now, using anon key as typically configured in these envs, but DDL usually requires more privs.
// If this fails, the user might need to run SQL manually in Supabase dashboard.
// actually, usually I need the SERVICE_ROLE_KEY for schema mods if not using the dashboard.
// checking env file for service role key might be a security risk to output, but I can check if it exists in process.env.
// I'll try with the provided keys. If it fails, I'll ask the user to run the SQL.

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applySchema() {
  const sqlPath = path.join(process.cwd(), 'update_decks_v3_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying schema update...');
  
  // Supabase JS client doesn't support raw SQL execution directly on the public interface usually.
  // We typically use the postgres connection or a remote procedure (RPC).
  // However, for this environment, I'll try to use the rpc 'exec_sql' if it exists, or just log instructions.
  
  // Wait, I can't run raw SQL via supabase-js client standard library without an RPC function exposed.
  // I will check if I can just assume the user will run it or if I have a way.
  
  // Alternative: I'll use the 'postgres' npm package if available, or just output the instructions.
  // But wait, I have `run_shell_command`. If `psql` is available... no, I can't assume that.
  
  // Let's try to verify if the columns exist first.
  const { error } = await supabase.from('decks').select('mana_cost').limit(1);
  
  if (error && error.message.includes('does not exist')) {
     console.error('❌ Columns missing. Please run the SQL in "update_decks_v3_schema.sql" in your Supabase SQL Editor.');
     console.log('\nSQL Content:\n', sql);
  } else {
     console.log('✅ Schema seems to be up to date (or accessible).');
  }
}

applySchema();
