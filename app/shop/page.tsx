import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import PrizeGrid from '@/components/shop/prize-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';

export default async function ShopPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch all prizes
  const { data: prizes, error: prizesError } = await supabase
    .from('prize_wall')
    .select('*')
    .order('cost', { ascending: true });

  if (prizesError) {
    console.error('Error fetching prizes:', prizesError);
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Prize Wall"
        subtitle="Spend your tickets on awesome prizes"
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* User Ticket Balance */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Your Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                <span className="text-3xl font-bold text-yellow-500">
                  {currentUser.tickets || 0}
                </span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Available tickets</p>
                <p className="text-slate-100 text-lg font-semibold">
                  {currentUser.tickets || 0} tickets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prizes Grid */}
        {prizesError ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <p className="text-slate-400 text-center">
                Failed to load prizes. Please try again later.
              </p>
            </CardContent>
          </Card>
        ) : !prizes || prizes.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <p className="text-slate-400 text-center">
                No prizes available at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PrizeGrid prizes={prizes} currentUser={currentUser} />
        )}
      </div>
    </main>
  );
}

