import { Component, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Shown when the caught error is "Not on allowlist"
function NotAllowlistedPage() {
  const identity = useQuery(api.allowlist.getMyIdentity);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-md space-y-4 p-6 border rounded-lg">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground text-sm">
          Your account is not on the allowlist. Share your WorkOS User ID with an admin to get access.
        </p>
        {identity === undefined && (
          <p className="text-sm text-muted-foreground">Loading your identity...</p>
        )}
        {identity && (
          <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
            <p className="font-medium">Your WorkOS User ID</p>
            <code className="block font-mono break-all">{identity.subject}</code>
            {identity.email && (
              <p className="text-muted-foreground">Email: {identity.email}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Generic error fallback for other errors
function GenericErrorPage({ error }: { error: Error }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-md space-y-4 p-6 border rounded-lg">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm font-mono">{error.message}</p>
      </div>
    </div>
  );
}

export class AllowlistErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      const isAllowlistError =
        error.message.includes('Not on allowlist') || error.message.includes('Unauthenticated');
      if (isAllowlistError) {
        return <NotAllowlistedPage />;
      }
      return <GenericErrorPage error={error} />;
    }
    return this.props.children;
  }
}
