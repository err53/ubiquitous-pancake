import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuthKit } from './ConvexProviderWithAuthKit';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const workosApiHostname = import.meta.env.VITE_WORKOS_API_HOSTNAME;
const useWorkosDevMode = !workosApiHostname || workosApiHostname === 'api.workos.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthKitProvider
        clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
        apiHostname={workosApiHostname}
        devMode={useWorkosDevMode}
        redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
      >
        <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithAuthKit>
      </AuthKitProvider>
    </ErrorBoundary>
  </StrictMode>,
);
