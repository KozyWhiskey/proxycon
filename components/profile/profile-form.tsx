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
import { AVAILABLE_COLORS, COLOR_DISPLAY_NAMES, getColorClass, isGuild } from '@/lib/player-colors';
import { Loader2 } from 'lucide-react';

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
        <Label className="text-foreground">Full Name</Label>
        <Input
          value={userName || ''}
          disabled
          className="h-12 bg-white/5 border-white/10 text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">Your registered account name.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Nickname</Label>
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Display name (optional)"
          className="h-12 bg-white/5 border-white/10 text-foreground"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          This will be displayed on brackets and matches instead of your full name.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Color Theme</Label>
        <Select
          value={color ?? 'auto'}
          onValueChange={(value) => {
            setColor(value === 'auto' ? undefined : value);
          }}
        >
          <SelectTrigger className="h-12 bg-white/5 border-white/10 text-foreground">
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
                    <span
                      className={`w-5 h-5 rounded-full ${getColorClass(c) || ''} shrink-0`}
                    />
                    <span>{COLOR_DISPLAY_NAMES[c]}</span>
                  </span>
                </SelectItem>
              ))}
            </div>

            <div className="px-2 py-1.5 border-t border-white/10 mt-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Guilds (Two-Color)
              </div>
              {AVAILABLE_COLORS.filter((c) => isGuild(c)).map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full ${getColorClass(c) || ''} shrink-0`}
                    />
                    <span>{COLOR_DISPLAY_NAMES[c]}</span>
                  </span>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Avatar URL</Label>
        <Input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="h-12 bg-white/5 border-white/10 text-foreground"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 font-semibold"
        variant="default"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Changes
      </Button>
    </form>
  );
}