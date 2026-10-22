'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createEvent } from '@/app/events/actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { chicagoToday } from '@/lib/weekend';

export default function NewEventForm() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [startDay, setStartDay] = useState(chicagoToday());
  const [endDay, setEndDay] = useState(chicagoToday());

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    try {
      const name = formData.get('name') as string;
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;
      const res = await createEvent(name, startDate, endDate, null);

      if (res.success && res.eventId) {
        toast.success('Event created successfully!');
        router.push(`/events/${res.eventId}`);
      } else {
        toast.error(res.message || 'Failed to create event');
        setIsCreating(false);
      }
    } catch { toast.error('Could not create the event. Check your connection and try again.'); }
    finally { setIsCreating(false); }
  }

  return (
    <Card className="glass-panel border-border">
      <CardHeader>
        <CardTitle className="text-xl font-heading">Event details</CardTitle>
        <CardDescription>Give the event a name and dates. You can invite everyone next.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Wisconsin Weekend"
              required
              className="bg-card border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDay}
                onChange={event => { setStartDay(event.target.value); if (endDay < event.target.value) setEndDay(event.target.value); }}
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                min={startDay}
                value={endDay}
                onChange={event => setEndDay(event.target.value)}
                required
                className="bg-card border-border"
              />
            </div>
          </div>

          <Button type="submit" className="w-full font-heading" disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create event
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
