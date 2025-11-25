import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import FixMatchResult from '@/components/admin/fix-match-result';
import AdjustTickets from '@/components/admin/adjust-tickets';
import CancelLastExpense from '@/components/admin/cancel-last-expense';
import ManagePlayers from '@/components/admin/manage-players';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Admin Panel"
        subtitle="God Mode - Fix mistakes and adjust data"
        showBackButton={true}
        backHref="/"
        backLabel="Dashboard"
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Warning Banner */}
        <Card className="bg-rose-500/10 border-rose-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-rose-500 font-semibold mb-1">Admin Access</p>
                <p className="text-sm text-rose-400">
                  These tools directly modify the database. Use with caution. Changes cannot be easily undone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        <div className="space-y-6">
          <ManagePlayers />
          <FixMatchResult />
          <AdjustTickets />
          <CancelLastExpense />
        </div>
      </div>
    </main>
  );
}

