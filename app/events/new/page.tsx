'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createEvent } from '@/app/events/actions';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { toast } from 'sonner';

export default function NewEventPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

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

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Event Setup"
        subtitle="Create a tournament weekend"
        backHref="/events"
        backLabel="Events"
      />

      <div className="max-w-3xl mx-auto p-4 space-y-8 mt-4">
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
      </div>
    </main>
  );
}
