'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteGuild } from '@/app/guilds/actions';
import { toast } from 'sonner';

interface DeleteGuildDialogProps {
  guildId: string;
  guildName: string;
}

export function DeleteGuildDialog({ guildId, guildName }: DeleteGuildDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmation !== guildName) return;

    setIsDeleting(true);
    const result = await deleteGuild(guildId);

    if (result.success) {
      toast.success('Guild disbanded forever.');
      setIsOpen(false);
      router.push('/'); // Return to dashboard
    } else {
      toast.error(result.message || 'Failed to delete guild.');
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="bg-red-950/50 hover:bg-red-900/80 text-red-200 border border-red-900/50">
          <Trash2 className="w-4 h-4 mr-2" />
          Disband
        </Button>
      </DialogTrigger>
      <DialogContent className="border-red-900/50 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Disband Guild
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            This action cannot be undone. This will permanently delete 
            <span className="font-bold text-white"> {guildName} </span> 
            and all associated events, history, and records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-zinc-300">
              Type <span className="font-mono font-bold text-red-400">{guildName}</span> to confirm.
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="bg-black/40 border-red-900/30 text-white placeholder:text-zinc-700 focus-visible:ring-red-500/50"
              placeholder={guildName}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmation !== guildName || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disbanding...
              </>
            ) : (
              'Confirm Disband'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
