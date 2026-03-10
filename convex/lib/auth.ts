import { QueryCtx, MutationCtx } from '../_generated/server';

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  const entry = await ctx.db
    .query('allowlist')
    .withIndex('by_email', (q) => q.eq('email', identity.email!))
    .unique();
  if (!entry) throw new Error('Not on allowlist');
  return { identity, isAdmin: entry.isAdmin };
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { identity, isAdmin } = await requireAuth(ctx);
  if (!isAdmin) throw new Error('Admin required');
  return identity;
}
