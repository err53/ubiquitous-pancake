import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';

export function AdminPage() {
  const entries = useQuery(api.allowlist.list);
  const myIdentity = useQuery(api.allowlist.getMyIdentity);
  const add = useMutation(api.allowlist.add);
  const remove = useMutation(api.allowlist.remove);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');

  if (entries === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Email Allowlist</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!email) return;
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await add({ email, subject: subject || undefined, isAdmin: false });
      setEmail('');
      setSubject('');
      toast.success('Email added to allowlist');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add email');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Email Allowlist</h1>
      {myIdentity && (
        <div className="text-sm bg-muted/50 rounded p-3 space-y-1">
          <p className="font-medium">Your identity</p>
          <p className="text-muted-foreground">WorkOS User ID: <code className="font-mono">{myIdentity.subject}</code></p>
          {myIdentity.email && <p className="text-muted-foreground">Email: {myIdentity.email}</p>}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
          className="w-64"
        />
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="WorkOS User ID (optional)"
          className="w-72"
        />
        <Button onClick={() => void handleAdd()} disabled={!email}>
          Add
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">WorkOS User ID</th>
            <th className="py-2">Admin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e._id} className="border-b">
              <td className="py-2">{e.email}</td>
              <td className="py-2 font-mono text-xs text-muted-foreground">{e.subject ?? '—'}</td>
              <td className="text-center py-2">{e.isAdmin ? 'Yes' : 'No'}</td>
              <td className="text-right py-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    remove({ id: e._id }).catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : 'Failed to remove email');
                    });
                  }}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
