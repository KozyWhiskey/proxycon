"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Users, 
  LayoutDashboard, 
  Layers, 
  UserCircle, 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  BarChart2,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/players", label: "Players", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/admin", label: "Admin", icon: ShieldAlert },
];

export function SideNav({ userRole = 'user' }: { userRole?: 'user' | 'admin' }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter items based on role
  const visibleNavItems = navItems.filter(item => {
    if (item.href === "/admin") {
      return userRole === 'admin';
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0 transition-all duration-300 ease-in-out z-40",
        isCollapsed ? "w-[80px]" : "w-[240px]"
      )}
    >
      {/* Header / Logo Area */}
      <div className={cn("h-16 flex items-center border-b border-border/50", isCollapsed ? "justify-center" : "px-6")}>
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(231,153,9,0.5)]">
              <span className="font-heading font-bold text-white text-lg">P</span>
           </div>
           {!isCollapsed && (
             <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
               ProxyCon
             </span>
           )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(231,153,9,0.1)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                isCollapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary drop-shadow-[0_0_5px_rgba(231,153,9,0.5)]" : "")} />
              
              {!isCollapsed && (
                <span className="font-medium text-sm font-heading tracking-wide">
                  {item.label}
                </span>
              )}
              
              {/* Active Indicator Bar (Left) */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(231,153,9,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : (
            <div className="flex items-center gap-2 w-full">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Collapse</span>
            </div>
          )}
        </Button>
      </div>
    </aside>
  );
}