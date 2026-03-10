import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { VehicleDetailPage } from '@/pages/VehicleDetailPage';
import { AdminPage } from '@/pages/AdminPage';
import { ComparisonPage } from '@/pages/ComparisonPage';

function SignInButton() {
  const { signIn } = useAuth();
  return (
    <button
      onClick={() => void signIn()}
      className="px-4 py-2 rounded-md border-2 bg-primary text-primary-foreground"
    >
      Sign in
    </button>
  );
}

export default function App() {
  return (
    <>
      <Unauthenticated>
        <div className="flex h-screen items-center justify-center">
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/vehicles" replace />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="compare" element={<ComparisonPage />} />
              {/* More routes added per chunk */}
              <Route path="*" element={<div className="p-4 text-muted-foreground">Page not found</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Authenticated>
    </>
  );
}
