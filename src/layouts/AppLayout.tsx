import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function AppLayout() {
  const { signOut } = useAuth();
  const role = useQuery(api.allowlist.getMyRole);
  return (
    <div className="flex h-screen">
      <nav className="w-56 border-r bg-muted/40 p-4 flex flex-col gap-2">
        <NavLink to="/vehicles">Vehicles</NavLink>
        <NavLink to="/compare">Compare</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        {role?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
        <div className="mt-auto">
          <button onClick={() => void signOut()} className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
