import { ReactNode } from "react";
import BottomNav from "@/components/navigation/bottom-nav";
import { SideNav } from "@/components/layout/side-nav";
import { createClient } from "@/utils/supabase/server";

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: 'user' | 'admin' = 'user';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role) {
      userRole = profile.role as 'user' | 'admin';
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <SideNav userRole={userRole} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden mb-16 md:mb-0 relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 flex-1 overflow-y-auto">
            {children}
        </div>
      </main>

      {/* Mobile Bottom Nav - Hidden on Desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}