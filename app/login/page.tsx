import { createClient } from '@/utils/supabase/server';
import PlayerSelectionGrid from './PlayerSelectionGrid';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching players:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-100">Error</h1>
          <p className="text-slate-400">Could not fetch player data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-100">No Players Found</h1>
          <p className="text-slate-400">Please add players to the database first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 py-8">
      <h1 className="text-4xl font-bold mb-12 text-slate-100">Who Are You?</h1>
      <PlayerSelectionGrid players={players} />
    </div>
  );
}
