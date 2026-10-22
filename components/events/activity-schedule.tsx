import Link from 'next/link';
import { formatLabel, isPodFormat, needsSeating } from '@/lib/activity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ShareCode from '@/components/join/share-code';
import LaunchSitting from '@/components/events/launch-sitting';

export interface ScheduleActivity {
  id: string;
  name: string;
  format: string;
  status: string;
  starts_on: string | null;
  invite_code: string | null;
  planned?: boolean | null;
  product_note?: string | null;
  abdicated?: boolean | null;
  bringer_name?: string | null;
  signup_count?: number;
}

export interface RoomMatch {
  id: string;
  tournament_id: string;
  table_number: number | null;
  join_code: string | null;
  names: string[];
  complete: boolean;
}

interface ActivityScheduleProps {
  eventId: string;
  inviteCode: string | null;
  activities: ScheduleActivity[];
  room: RoomMatch[];
}

function sittingHref(activity: ScheduleActivity) {
  if (isPodFormat(activity.format)) return `/tournament/${activity.id}/pods`;
  if (activity.status === 'pending' && needsSeating(activity.format)) return `/tournament/${activity.id}/seating`;
  return `/tournament/${activity.id}`;
}

export default function ActivitySchedule({ eventId, inviteCode, activities, room }: ActivityScheduleProps) {
  return (
    <div className="space-y-4">
      {inviteCode && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="font-heading text-base">Join the weekend</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareCode path={`/invite/${inviteCode}`} code={inviteCode} label="Weekend code" />
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-base">Sittings</CardTitle>
          <Button asChild size="sm">
            <Link href={`/tournament/new?eventId=${eventId}`}>Add sitting</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground">No drafts or pods yet. Add Friday&apos;s draft, Saturday&apos;s cube, or a commander table.</p>
          )}
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-white/10 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-foreground">{activity.name}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {formatLabel(activity.format)}
                    {activity.starts_on ? ` · ${activity.starts_on}` : ''}
                    {activity.planned ? ' · planned' : ` · ${activity.status}`}
                  </p>
                  {activity.product_note && <p className="text-sm text-muted-foreground">{activity.product_note}</p>}
                  {(activity.abdicated || activity.bringer_name) && (
                    <p className="text-xs text-muted-foreground">
                      {activity.abdicated ? 'Needs someone to bring the product' : `${activity.bringer_name} is bringing it`}
                    </p>
                  )}
                </div>
                {!activity.planned && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={sittingHref(activity)}>Open</Link>
                  </Button>
                )}
              </div>
              {activity.planned && (
                <LaunchSitting tournamentId={activity.id} signups={activity.signup_count || 0} />
              )}
              {activity.invite_code && (
                <ShareCode path={`/join/sitting/${activity.invite_code}`} code={activity.invite_code} label={activity.planned ? 'Sign up' : 'Check in'} />
              )}
              <Button asChild variant="ghost" size="sm" className="px-0">
                <Link href={`/tournament/${activity.id}/deck`}>Photograph a deck</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {room.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="font-heading text-base">Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {room.map((match) => (
              <div key={match.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2">
                <div>
                  <p className="text-sm text-foreground">
                    {match.table_number ? `Table ${match.table_number}` : 'Table'} · {match.names.join(' vs ') || 'Open'}
                  </p>
                  <p className="text-xs text-muted-foreground">{match.complete ? 'Reported' : 'In progress'}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={match.join_code ? `/join/table/${match.join_code}` : `/tournament/${match.tournament_id}/match/${match.id}`}>
                    Open
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
