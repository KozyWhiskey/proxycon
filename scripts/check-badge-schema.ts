import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applySchema() {
  const sqlPath = path.join(process.cwd(), 'create_badges_v3_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Check if badges table exists
  const { error } = await supabase.from('badges').select('id').limit(1);

  if (error && error.message.includes('does not exist')) {
    console.error('❌ Badges tables missing. Please run the SQL in "create_badges_v3_schema.sql" in your Supabase SQL Editor.');
    console.log('\nSQL Content:\n', sql);
  } else {
    console.log('✅ Badge schema seems to exist.');
  }
}

applySchema();
