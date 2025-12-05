'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logout } from '@/app/login/actions';
import { updateMyProfile } from '@/app/user/actions';
import { LogOut, User, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { AVAILABLE_COLORS, COLOR_DISPLAY_NAMES, getColorClass, isGuild } from '@/lib/player-colors';

interface UserHeaderProps {
  userName: string;
  userNickname: string | null;
  userColor: string | null;
  userAvatarUrl: string | null;
}

export default function UserHeader({ 
  userName, 
  userNickname, 
  userColor, 
  userAvatarUrl 
}: UserHeaderProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nickname, setNickname] = useState(userNickname || '');
  const [color, setColor] = useState<string | undefined>(userColor || undefined);
  const [avatarUrl, setAvatarUrl] = useState(userAvatarUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state with props when they change (e.g., after refresh)
  useEffect(() => {
    if (!isEditDialogOpen) {
      // Only sync when dialog is closed to avoid interrupting user input
      setNickname(userNickname || '');
      setColor(userColor || undefined);
      setAvatarUrl(userAvatarUrl || '');
    }
  }, [userNickname, userColor, userAvatarUrl, isEditDialogOpen]);

  // Compute display name from props (always up-to-date)
  const displayName = userNickname || userName;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      // Handle redirect error (it's expected)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return; // Redirect is expected, don't show error
        }
      }
      toast.error('Failed to logout. Please try again.');
    }
  };

  const handleEditClick = () => {
    // Always sync with current props when opening dialog
    // Use the latest prop values directly
    const currentNickname = userNickname || '';
    const currentColor = userColor || undefined;
    const currentAvatarUrl = userAvatarUrl || '';
    
    setNickname(currentNickname);
    setColor(currentColor);
    setAvatarUrl(currentAvatarUrl);
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsSubmitting(true);
    const result = await updateMyProfile({
      nickname: nickname.trim() || null,
      color: color === 'auto' || color === undefined ? null : (color?.trim() || null),
      avatar_url: avatarUrl.trim() || null,
    });

    if (result.success) {
      toast.success(result.message || 'Profile updated successfully');
      setIsEditDialogOpen(false);
      // Refresh the page to show the updated profile
      router.refresh();
    } else {
      toast.error(result.message || 'Failed to update profile');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex items-center justify-between w-full p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0">
            <User className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-400">Playing as</p>
            <p className="text-lg font-semibold text-slate-100 truncate">{displayName}</p>
          </div>
          <Button
            onClick={handleEditClick}
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/10"
            aria-label="Edit profile"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="h-12 px-4 text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes - sync with current props
            setNickname(userNickname || '');
            setColor(userColor || undefined);
            setAvatarUrl(userAvatarUrl || '');
          } else {
            // When opening, ensure we have the latest values from props
            setNickname(userNickname || '');
            setColor(userColor || undefined);
            setAvatarUrl(userAvatarUrl || '');
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit Profile</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your display name, color theme, and avatar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-100">Full Name</Label>
              <Input
                value={userName}
                disabled
                className="h-12 bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Nickname</Label>
              <Input
                value={nickname || ''}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Display name (optional)"
                className="h-12 bg-slate-800 border-slate-700 text-slate-100"
                maxLength={50}
              />
              <p className="text-xs text-slate-500">
                Your nickname will be displayed instead of your full name. Leave blank to use your
                full name.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Color Theme</Label>
              <Select
                value={color ?? 'auto'}
                onValueChange={(value) => {
                  setColor(value === 'auto' ? undefined : value);
                }}
              >
                <SelectTrigger className="h-12 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Auto (based on name)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-[400px]">
                  <SelectItem value="auto" className="text-slate-100 focus:bg-slate-700">
                    Auto (based on name)
                  </SelectItem>
                  
                  {/* Single Colors Section */}
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Single Colors
                    </div>
                    {AVAILABLE_COLORS.filter((c) => !isGuild(c)).map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="text-slate-100 focus:bg-slate-700"
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

                  {/* Guilds Section */}
                  <div className="px-2 py-1.5 border-t border-slate-700 mt-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Guilds (Two-Color)
                    </div>
                    {AVAILABLE_COLORS.filter((c) => isGuild(c)).map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="text-slate-100 focus:bg-slate-700"
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
              <p className="text-xs text-slate-500">
                Choose a Magic: The Gathering color theme for your avatar. Leave as "Auto" to use automatic
                assignment based on name.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-100">Avatar URL</Label>
              <Input
                value={avatarUrl || ''}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg (optional)"
                className="h-12 bg-slate-800 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-500">
                URL to your avatar image. This will be displayed on the login screen and throughout the app.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              disabled={isSubmitting}
              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

