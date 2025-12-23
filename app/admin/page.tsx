import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import FixMatchResult from '@/components/admin/fix-match-result';
import UserManager from '@/components/admin/user-manager';
import EventManager from '@/components/admin/event-manager';
import BadgeManager from '@/components/admin/badge-manager';
import { AlertTriangle, Users, Calendar, Trophy, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.profile?.role !== 'admin') {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Admin Panel"
        subtitle="God Mode - Manage users, events, and data"
        showBackButton={true}
        backHref="/"
        backLabel="Dashboard"
      />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Warning Banner */}
        <Card className="bg-rose-500/10 border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-rose-500 font-semibold mb-1">Admin Access</p>
                <p className="text-sm text-rose-400">
                  You are in God Mode. Actions here directly modify the database and affect all users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Trophy className="w-4 h-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Award className="w-4 h-4 mr-2" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManager />
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <EventManager />
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
             <div className="max-w-2xl">
               <FixMatchResult />
             </div>
          </TabsContent>

          <TabsContent value="badges" className="mt-6">
            <div className="max-w-xl">
              <BadgeManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
