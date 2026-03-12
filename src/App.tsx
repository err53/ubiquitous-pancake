import type { ReactNode } from 'react';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/layouts/AppLayout';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { VehicleDetailPage } from '@/pages/VehicleDetailPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { SettingsPage } from '@/pages/SettingsPage';

function SignInButton() {
  const { signIn } = useAuth();
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span className="text-2xl font-semibold tracking-tight">CarCosts</span>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Track your vehicle operating costs. Access is invite-only.
      </p>
      <Button size="lg" onClick={() => void signIn()}>
        Sign in
      </Button>
    </div>
  );
}

function AuthScreen({ children }: { children: ReactNode }) {
  return <div className="flex h-screen items-center justify-center">{children}</div>;
}

function CallbackPage() {
  const { signIn } = useAuth();

  return (
    <AuthScreen>
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="text-lg font-medium">Completing sign-in...</div>
        <p className="text-sm text-muted-foreground">
          If this page does not advance, the WorkOS code exchange failed in the browser.
        </p>
        <Button variant="outline" onClick={() => void signIn()}>
          Try sign in again
        </Button>
      </div>
    </AuthScreen>
  );
}

function LoadingPage() {
  return (
    <AuthScreen>
      <div className="text-sm text-muted-foreground">Loading...</div>
    </AuthScreen>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthLoading>
        <LoadingPage />
      </AuthLoading>
      <Unauthenticated>
        <Routes>
          <Route path="/callback" element={<CallbackPage />} />
          <Route
            path="*"
            element={
              <AuthScreen>
                <SignInButton />
              </AuthScreen>
            }
          />
        </Routes>
      </Unauthenticated>
      <Authenticated>
        <Routes>
          <Route path="/callback" element={<Navigate to="/vehicles" replace />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/vehicles" replace />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="vehicles/:id" element={<VehicleDetailPage />} />
            <Route path="compare" element={<ComparisonPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* More routes added per chunk */}
            <Route path="*" element={<div className="p-4 text-muted-foreground">Page not found</div>} />
          </Route>
        </Routes>
      </Authenticated>
    </BrowserRouter>
  );
}
