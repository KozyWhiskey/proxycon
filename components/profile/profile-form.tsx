'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateMyProfile } from '@/app/user/actions';
import { toast } from 'sonner';
import { AVAILABLE_COLORS, COLOR_DISPLAY_NAMES, isGuild } from '@/lib/player-colors';
import { Loader2 } from 'lucide-react';
import { ManaIdentity } from '@/components/ui/mana-identity';

interface ProfileFormProps {
  userName: string | null;
  userNickname: string | null;
  userColor: string | null;
  userAvatarUrl: string | null;
}

export default function ProfileForm({
  userName,
  userNickname,
  userColor,
  userAvatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(userNickname || '');
  const [color, setColor] = useState<string | undefined>(userColor || undefined);
  const [avatarUrl, setAvatarUrl] = useState(userAvatarUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await updateMyProfile({
      nickname: nickname.trim() || null,
      color: color === 'auto' || color === undefined ? null : (color?.trim() || null),
      avatar_url: avatarUrl.trim() || null,
    });

    if (result.success) {
      toast.success(result.message || 'Profile updated successfully');
      router.refresh();
    } else {
      toast.error(result.message || 'Failed to update profile');
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSaveProfile} className="space-y-6">

      <div className="space-y-2">
        <Label className="text-foreground" htmlFor="play-name">Play name</Label>
        <Input
          id="play-name"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Name on the table"
          className="h-12 bg-muted border-border text-foreground"
          maxLength={40}
          required
        />
        <p className="text-xs text-muted-foreground">
          Changing this updates every event you have already played.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground" htmlFor="player-colors">Player colors</Label>
        <Select
          value={color ?? 'auto'}
          onValueChange={(value) => {
            setColor(value === 'auto' ? undefined : value);
          }}
        >
          <SelectTrigger id="player-colors" className="h-12 bg-muted border-border text-foreground">
            <SelectValue placeholder="Auto (based on name)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              Auto (based on name)
            </SelectItem>
            
            <div className="px-2 py-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Single Colors
              </div>
              {AVAILABLE_COLORS.filter((c) => !isGuild(c)).map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                >
                  <span className="flex items-center gap-2">
                    <ManaIdentity color={c} decorative />
                    <span>{COLOR_DISPLAY_NAMES[c]}</span>
                  </span>
                </SelectItem>
              ))}
            </div>

            <div className="px-2 py-1.5 border-t border-border mt-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Guilds (Two-Color)
              </div>
              {AVAILABLE_COLORS.filter((c) => isGuild(c)).map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                >
                  <span className="flex items-center gap-2">
                    <ManaIdentity color={c} decorative />
                    <span>{COLOR_DISPLAY_NAMES[c]}</span>
                  </span>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <details className="disclosure"><summary>Optional profile details</summary><p className="subtle">Account: {userName||'Picked name'}</p>      <div className="space-y-2">
        <Label className="text-foreground" htmlFor="avatar-url">Avatar URL</Label>
        <Input
          id="avatar-url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="h-12 bg-muted border-border text-foreground"
        />
      </div></details>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 font-semibold"
        variant="default"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save changes
      </Button>
    </form>
  );
}