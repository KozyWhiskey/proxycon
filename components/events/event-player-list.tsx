import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Member {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface EventPlayerListProps {
  members: Member[];
}

export default function EventPlayerList({ members }: EventPlayerListProps) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading">Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-zinc-800 text-sm">
                  {member.display_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.display_name}
                  {member.role === 'owner' && (
                    <span className="ml-2 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                      Owner
                    </span>
                  )}
                  {member.role === 'admin' && (
                    <span className="ml-2 text-[10px] bg-zinc-800 text-muted-foreground border border-white/5 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                      Admin
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider">
                  @{member.username}
                </p>
              </div>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No players yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
