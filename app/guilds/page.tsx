import { requireProfile } from '@/lib/get-current-user';
import { getUserGuilds, getPublicGuilds, requestToJoin } from '@/app/guilds/actions';
import PageHeader from '@/components/ui/page-header';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Plus, ArrowRight, Globe, Lock, Search, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateGuildDialog } from '@/components/guilds/create-guild-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JoinRequestButton } from '@/components/guilds/join-request-button';

export default async function GuildsIndexPage() {
  const { user } = await requireProfile();
  
  // Parallel fetch
  const [userGuilds, publicGuilds] = await Promise.all([
    getUserGuilds(user.id),
    getPublicGuilds(),
  ]);

  return (
    <div className="min-h-screen pb-24">
      <PageHeader 
        title="Guilds" 
        subtitle="Gaming communities and alliances"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        
        <Tabs defaultValue="my-guilds" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <TabsList className="bg-black/20 border border-white/10 p-1 h-12">
              <TabsTrigger value="my-guilds" className="font-heading uppercase tracking-wider px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                My Guilds
              </TabsTrigger>
              <TabsTrigger value="directory" className="font-heading uppercase tracking-wider px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Globe className="w-4 h-4 mr-2" />
                Directory
              </TabsTrigger>
            </TabsList>

            <CreateGuildDialog>
                <Button className="font-heading shadow-lg shadow-amber-900/20">
                    <Plus className="w-4 h-4 mr-2" /> Establish Guild
                </Button>
            </CreateGuildDialog>
          </div>

          <TabsContent value="my-guilds" className="mt-0">
            {userGuilds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userGuilds.map((guild) => (
                        <Link key={guild.id} href={`/guilds/${guild.slug}`} className="group">
                            <Card className="glass-panel h-full border-white/10 hover:border-primary/50 transition-colors">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getThemeGradient(guild.theme_color)} text-white shadow-lg`}>
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="font-heading text-lg group-hover:text-primary transition-colors truncate">
                                            {guild.name}
                                        </CardTitle>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
                                            {guild.role}
                                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                                            {guild.status === 'active' ? 'Member' : guild.status}
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                                        <span className="opacity-60 italic">@{guild.slug}</span>
                                        <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                                            <span>Visit</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-muted-foreground/30">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-heading">No Allegiances Yet</h2>
                        <p className="max-w-md text-sm text-muted-foreground">
                            You are a Ronin. Join an existing guild via invite code, or establish your own order.
                        </p>
                    </div>
                    <CreateGuildDialog>
                        <Button variant="outline" className="border-white/10">
                            Establish Guild
                        </Button>
                    </CreateGuildDialog>
                </div>
            )}
          </TabsContent>

          <TabsContent value="directory" className="mt-0">
             <div className="space-y-6">
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-lg border border-white/5">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input 
                        placeholder="Search for guilds..." 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {publicGuilds.map((guild: any) => {
                        const isMember = userGuilds.some(ug => ug.id === guild.id);
                        
                        return (
                            <Card key={guild.id} className="glass-panel border-white/5 overflow-hidden">
                                <div className="flex flex-col md:flex-row">
                                    <div className={`w-full md:w-3 bg-gradient-to-b ${getThemeGradient(guild.theme_color)} opacity-50`} />
                                    <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-heading text-xl">{guild.name}</h3>
                                                <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono italic">
                                                    @{guild.slug}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                                                {guild.description || "No description provided."}
                                            </p>
                                            <div className="flex items-center gap-4 pt-2">
                                                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    <Crown className="w-3 h-3 text-amber-500" />
                                                    {guild.owner?.display_name || 'Anonymous'}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    <Globe className="w-3 h-3 text-primary" />
                                                    Public
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            {isMember ? (
                                                <Button asChild variant="outline" className="w-full md:w-auto border-white/10">
                                                    <Link href={`/guilds/${guild.slug}`}>Entered</Link>
                                                </Button>
                                            ) : (
                                                <JoinRequestButton guildId={guild.id} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getThemeGradient(color: string | null) {
  const map: Record<string, string> = {
    gold: 'from-amber-700 to-yellow-600',
    blue: 'from-blue-700 to-cyan-600',
    red: 'from-red-700 to-orange-600',
    green: 'from-emerald-700 to-green-600',
    black: 'from-zinc-800 to-zinc-950',
  };
  return map[color || 'gold'] || map.gold;
}
