import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import badgeImg from '@/public/proxycon_badge.png';
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
          <div className="flex justify-center">
            <Image
              src={badgeImg}
              alt="ProxyCon 2025 crest"
              priority
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 304px, 360px"
              className="w-60 sm:w-72 md:w-80 h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
            />
          </div>
          <p className="text-xl text-slate-400 mb-2">Who Are You?</p>
          <p className="text-sm text-slate-500">Select your name to get started</p>
        </div>

        {/* Player Grid */}
        <PlayerSelectionGrid players={players} />
      </div>
    </div>
  );
}
