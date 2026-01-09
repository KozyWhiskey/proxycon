'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Archive, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { endEvent, reactivateEvent } from '@/app/events/actions';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface EventSettingsDialogProps {
  eventId: string;
  eventName: string;
  isActive: boolean;
}

export default function EventSettingsDialog({
  eventId,
  eventName,
  isActive,
}: EventSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggleStatus = async () => {
    if (isActive) {
      if (!confirm('Are you sure you want to end this event? It will be moved to the Past Events list.')) return;
    }

    startTransition(async () => {
      const result = isActive 
        ? await endEvent(eventId)
        : await reactivateEvent(eventId);
        
      if (result.success) {
        toast.success(isActive ? 'Event archived' : 'Event reactivated');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 bg-white/5 border-white/10 hover:bg-white/10">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-panel">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Event Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            Manage {eventName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          
          <div className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground font-heading tracking-wide">Event Status</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {isActive 
                    ? "Event is currently active and visible on dashboards." 
                    : "Event is archived and moved to past events."}
                </p>
              </div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Archived"}
              </Badge>
            </div>

            <div className="pt-2">
              <Button 
                variant={isActive ? "destructive" : "outline"} 
                className="w-full"
                onClick={handleToggleStatus}
                disabled={isPending}
              >
                {isActive ? (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    End Event & Archive
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reactivate Event
                  </>
                )}
              </Button>
              {isActive && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  This will hide it from the "Active Events" list.
                </p>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
