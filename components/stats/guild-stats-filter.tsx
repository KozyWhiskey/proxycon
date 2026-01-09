'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface GuildStatsFilterProps {
  userGuilds: { id: string; name: string }[];
}

export default function GuildStatsFilter({ userGuilds }: GuildStatsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentGuildId = searchParams.get('guild') || 'global';

  const handleGuildChange = (value: string) => {
    if (value === 'global') {
      router.push('/stats');
    } else {
      router.push(`/stats?guild=${value}`);
    }
  };

  return (
    <div className="flex justify-end items-center gap-3 mb-6">
      <Label className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
        Select Guild
      </Label>
      <div className="w-[180px]">
        <Select value={currentGuildId} onValueChange={handleGuildChange}>
          <SelectTrigger className="bg-white/5 border-white/10 text-foreground h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">All</SelectItem>
            {userGuilds.map((guild) => (
              <SelectItem key={guild.id} value={guild.id}>
                {guild.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
