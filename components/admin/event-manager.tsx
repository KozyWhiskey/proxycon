'use client';

import { useState, useEffect } from 'react';
import { getEvents, updateEvent } from '@/app/admin/actions';
import { Event } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Power } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    const result = await getEvents();
    if (result.success && result.data) {
      setEvents(result.data);
    }
    setIsLoading(false);
  }

  async function handleToggleActive(eventId: string, currentStatus: boolean) {
    setIsUpdating(eventId);
    const result = await updateEvent(eventId, { is_active: !currentStatus });
    
    if (result.success) {
      toast.success(currentStatus ? 'Event archived' : 'Event activated');
      await loadEvents();
    } else {
      toast.error(result.message);
    }
    setIsUpdating(null);
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Event Management</CardTitle>
        <CardDescription>Oversee all events on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="font-medium">{event.name}</div>
                  <div className="text-xs text-muted-foreground">{event.slug || 'No slug'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={event.is_active ? 'default' : 'secondary'}>
                    {event.is_active ? 'Active' : 'Archived'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'TBD'}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    asChild
                  >
                    <Link href={`/events/${event.id}`}>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={isUpdating === event.id}
                    onClick={() => handleToggleActive(event.id, event.is_active)}
                  >
                    {isUpdating === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <Power className={`w-4 h-4 ${event.is_active ? 'text-red-500' : 'text-green-500'}`} />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
