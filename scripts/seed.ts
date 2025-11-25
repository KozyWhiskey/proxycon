// scripts/seed.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const playersToSeed = [
  { name: 'Craig', nickname: 'Craig', wins: 0, tickets: 0 },
  { name: 'JJ', nickname: 'JJ', wins: 0, tickets: 0 },
  { name: 'Rohan', nickname: 'Rohan', wins: 0, tickets: 0 },
  { name: 'Chris', nickname: 'Chris', wins: 0, tickets: 0 },
  { name: 'Denny', nickname: 'Denny', wins: 0, tickets: 0 },
  { name: 'Sid', nickname: 'Sid', wins: 0, tickets: 0 },
  { name: 'Michael', nickname: 'Michael', wins: 0, tickets: 0 },
];

async function seedPlayers() {
  console.log('Starting player seeding...');
  
  for (const player of playersToSeed) {
    // Check if player already exists to prevent duplicates
    const { data: existingPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id')
      .eq('name', player.name);

    if (fetchError) {
      console.error(`Error checking for existing player ${player.name}:`, fetchError);
      continue;
    }

    if (existingPlayers && existingPlayers.length > 0) {
      console.log(`Player ${player.name} already exists. Skipping.`);
      continue;
    }

    // Insert player if they don't exist
    const { data, error } = await supabase
      .from('players')
      .insert([player]);

    if (error) {
      console.error(`Error seeding player ${player.name}:`, error);
    } else {
      console.log(`Successfully seeded player: ${player.name}`);
    }
  }

  console.log('Player seeding complete.');
}

seedPlayers().catch((err) => {
  console.error('Unhandled error during seeding:', err);
  process.exit(1);
});
