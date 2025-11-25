import { createClient } from '@/utils/supabase/server';
import PlayerSelectionGrid from './PlayerSelectionGrid';
import { Sparkles } from 'lucide-react';

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
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <Sparkles className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-slate-100">Oops!</h1>
          <p className="text-slate-400">Could not fetch player data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-slate-100">No Players Found</h1>
          <p className="text-slate-400">Please add players to the database first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
            <Sparkles className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-slate-100">
            ProxyCon 2025
          </h1>
          <p className="text-xl text-slate-400 mb-2">Who Are You?</p>
          <p className="text-sm text-slate-500">Select your name to get started</p>
        </div>

        {/* Player Grid */}
        <PlayerSelectionGrid players={players} />
      </div>
    </div>
  );
}
