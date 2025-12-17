'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { createEvent, joinEvent } from '@/app/events/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { toast } from 'sonner';

export default function NewEventPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    const name = formData.get('name') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    const res = await createEvent(name, startDate, endDate);
    
    if (res.success && res.eventId) {
      toast.success('Event created successfully!');
      router.push(`/events/${res.eventId}`);
    } else {
      toast.error(res.message || 'Failed to create event');
      setIsCreating(false);
    }
  }

  async function handleJoin(formData: FormData) {
    setIsJoining(true);
    const code = formData.get('inviteCode') as string;

    const res = await joinEvent(code);

    if (res.success && res.eventId) {
        toast.success(res.message || 'Joined event successfully!');
        router.push(`/events/${res.eventId}`);
    } else {
        toast.error(res.message || 'Failed to join event');
        setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Event Setup"
        subtitle="Create or join a tournament weekend"
        backHref="/events"
        backLabel="Events"
      />

      <div className="max-w-md mx-auto p-4 space-y-8 mt-4">
        {/* Create Event */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100">Create New Event</CardTitle>
            <CardDescription>Host a new tournament weekend.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="ProxyCon 2026" 
                  required 
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    name="startDate" 
                    type="date" 
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate" 
                    name="endDate" 
                    type="date" 
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Event
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-950 px-2 text-slate-500">Or</span>
            </div>
        </div>

        {/* Join Event */}
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="text-xl text-slate-100">Join Existing Event</CardTitle>
                <CardDescription>Enter an invite code to join a league.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleJoin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="inviteCode">Invite Code</Label>
                        <Input 
                            id="inviteCode" 
                            name="inviteCode" 
                            placeholder="XYZ123" 
                            required 
                            className="bg-slate-950 border-slate-800 uppercase tracking-widest"
                        />
                    </div>
                    <Button type="submit" variant="outline" className="w-full border-slate-800 text-slate-200 hover:bg-slate-800" disabled={isJoining}>
                        {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Join Event
                    </Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
