import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@workos-inc/authkit-react';
import { Car, BarChart2, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const { signOut } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary/15 text-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
    }`;

  return (
    <div className="flex h-screen bg-background">
      <nav className="w-52 border-r border-border flex flex-col shrink-0 bg-sidebar">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight">CarCosts</span>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-auto">
          <NavLink to="/vehicles" className={navItemClass}>
            <Car className="w-4 h-4 shrink-0" />
            Vehicles
          </NavLink>
          <NavLink to="/compare" className={navItemClass}>
            <BarChart2 className="w-4 h-4 shrink-0" />
            Compare
          </NavLink>
          <NavLink to="/settings" className={navItemClass}>
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </NavLink>
        </div>

        {/* Sign out */}
        <div className="px-2 py-3 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => void signOut()}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground px-3"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
