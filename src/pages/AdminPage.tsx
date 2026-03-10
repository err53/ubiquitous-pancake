import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';

export function AdminPage() {
  const entries = useQuery(api.allowlist.list);
  const add = useMutation(api.allowlist.add);
  const remove = useMutation(api.allowlist.remove);
  const [email, setEmail] = useState('');

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
      await add({ email, isAdmin: false });
      setEmail('');
      toast.success('Email added to allowlist');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add email');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Email Allowlist</h1>
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
        />
        <Button onClick={() => void handleAdd()} disabled={!email}>
          Add
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Email</th>
            <th className="py-2">Admin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e._id} className="border-b">
              <td className="py-2">{e.email}</td>
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
