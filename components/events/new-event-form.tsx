'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { createEvent } from '@/app/events/actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { chicagoToday } from '@/lib/weekend';

export default function NewEventForm() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error,setError]=useState('');
  const [eventName,setEventName]=useState('');
  const [startDay, setStartDay] = useState(chicagoToday());
  const [endDay, setEndDay] = useState(chicagoToday());

  async function handleCreate(formData: FormData) {
    setError('');
    const draftName=String(formData.get('name')||'').trim();
    if(!draftName || draftName.length>100){setError('Use an event name from 1 to 100 characters.');return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !/^\d{4}-\d{2}-\d{2}$/.test(endDay) || endDay<startDay){setError('End date must be on or after the start date.');return;}
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
        setError(res.message || 'Could not create event.');
        setIsCreating(false);
      }
    } catch { setError('Could not create the event. Check your connection and try again.'); }
    finally { setIsCreating(false); }
  }

  return (
    <Card className="glass-panel border-border">
      <CardContent className="pt-6">
        <form action={handleCreate} noValidate className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event name</Label>
            <Input
              id="name"
              name="name"
              value={eventName}
              onChange={event=>setEventName(event.target.value)}
              placeholder="e.g. Wisconsin Weekend"
              required
              maxLength={100}
              className="bg-card border-border"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

          {error&&<p role="alert" className="text-destructive">{error}</p>}
          <Button type="submit" className="w-full font-heading" disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create event
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
