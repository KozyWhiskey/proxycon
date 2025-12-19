'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { joinEvent } from '@/app/events/actions';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinEventDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin(formData: FormData) {
    setIsJoining(true);
    const code = formData.get('inviteCode') as string;

    const res = await joinEvent(code);

    if (res.success && res.eventId) {
        toast.success(res.message || 'Joined event successfully!');
        setIsOpen(false);
        router.push(`/events/${res.eventId}`);
    } else {
        toast.error(res.message || 'Failed to join event');
        setIsJoining(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800">
          <UserPlus className="w-4 h-4 mr-2" />
          Join Event
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Existing Event</DialogTitle>
          <DialogDescription>Enter the invite code shared by the event organizer.</DialogDescription>
        </DialogHeader>
        <form action={handleJoin} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-slate-100">Invite Code</Label>
                <Input 
                    id="inviteCode" 
                    name="inviteCode" 
                    placeholder="XYZ123" 
                    required 
                    className="bg-slate-950 border-slate-800 uppercase tracking-widest text-center text-lg"
                />
            </div>
            <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isJoining}>
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Join Event
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
