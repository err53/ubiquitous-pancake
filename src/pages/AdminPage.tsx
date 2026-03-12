import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { toast } from 'sonner';

export function AdminPage() {
  const entries = useQuery(api.allowlist.list);
  const myEmail = useQuery(api.allowlist.getMyEmail);
  const add = useMutation(api.allowlist.add);
  const remove = useMutation(api.allowlist.remove);
  const [email, setEmail] = useState('');

  if (entries === undefined) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Email Allowlist</h1>
        <p className="text-muted-foreground text-sm">Loading…</p>
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
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email Allowlist</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users who can access this application.</p>
      </div>

      {myEmail && (
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signed In Email</p>
            <p className="text-sm text-muted-foreground">{myEmail.email ?? 'Email unavailable'}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Add user</p>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            onKeyDown={(e) => e.key === 'Enter' && void handleAdd()}
            className="w-64"
          />
          <Button onClick={() => void handleAdd()} disabled={!email}>
            Add
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium text-center">Admin</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No entries yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-medium py-3">{e.email}</TableCell>
                  <TableCell className="text-center py-3">
                    {e.isAdmin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">
                        Admin
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3">
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
