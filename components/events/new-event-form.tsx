'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createEvent } from '@/app/events/actions';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface GuildOption {
  id: string;
  name: string;
}

interface NewEventFormProps {
  guilds: GuildOption[];
  defaultGuildId?: string;
}

export default function NewEventForm({ guilds, defaultGuildId }: NewEventFormProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState<string | undefined>(defaultGuildId);

  async function handleCreate(formData: FormData) {
    setIsCreating(true);
    const name = formData.get('name') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    // organizationId is handled via state or hidden input, but form action gets formData
    // Since we're using a direct function call inside the action wrapper, we pass it explicitly
    
    // Better: Client-side handler calls server action directly
    const res = await createEvent(name, startDate, endDate, selectedGuildId);
    
    if (res.success && res.eventId) {
      toast.success('Event created successfully!');
      router.push(`/events/${res.eventId}`);
    } else {
      toast.error(res.message || 'Failed to create event');
      setIsCreating(false);
    }
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="text-xl font-heading">Create New Event</CardTitle>
        <CardDescription>Host a new tournament weekend or league season.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleCreate} className="space-y-6">
          
          {/* Guild Selector */}
          {guilds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="guild">Host Guild (Optional)</Label>
              <Select 
                value={selectedGuildId || "none"} 
                onValueChange={(val) => setSelectedGuildId(val === "none" ? undefined : val)}
              >
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue placeholder="Select a Guild" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Guild (Personal Event)</SelectItem>
                  {guilds.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        {guild.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Linking an event to a guild shares it with all members automatically.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g. Winter League 2026" 
              required 
              className="bg-black/20 border-white/10"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input 
                id="startDate" 
                name="startDate" 
                type="date" 
                className="bg-black/20 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input 
                id="endDate" 
                name="endDate" 
                type="date" 
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full font-heading" disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Event
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
