
import { getUserGuilds } from '../app/guilds/actions';
import { createClient } from '../utils/supabase/server';

async function main() {
  // We need a real user ID. I'll try to find one or just list all members first to pick one.
  const supabase = await createClient();
  const { data: members } = await supabase.from('organization_members').select('profile_id').limit(1);
  
  if (!members || members.length === 0) {
    console.log("No members found to test with.");
    return;
  }

  const userId = members[0].profile_id;
  console.log("Testing with User ID:", userId);

  const guilds = await getUserGuilds(userId);
  console.log("Returned Guilds:", JSON.stringify(guilds, null, 2));
}

main().catch(console.error);
