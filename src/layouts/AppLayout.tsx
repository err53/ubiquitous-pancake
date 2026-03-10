import { Outlet, NavLink } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <nav className="w-56 border-r bg-muted/40 p-4 flex flex-col gap-2">
        <NavLink to="/vehicles">Vehicles</NavLink>
        <NavLink to="/compare">Compare</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
