import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function AdminPage() {
  const entries = useQuery(api.allowlist.list);
  const add = useMutation(api.allowlist.add);
  const remove = useMutation(api.allowlist.remove);
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    if (!email) return;
    await add({ email, isAdmin: false });
    setEmail('');
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
          {entries?.map((e) => (
            <tr key={e._id} className="border-b">
              <td className="py-2">{e.email}</td>
              <td className="text-center py-2">{e.isAdmin ? 'Yes' : 'No'}</td>
              <td className="text-right py-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void remove({ id: e._id })}
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
