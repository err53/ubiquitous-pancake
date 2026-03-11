import { QueryCtx, MutationCtx } from '../_generated/server';

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');

  // WorkOS User Management JWTs use `sub` (user ID), not `email`.
  // Look up by subject first (reliable), then fall back to email if present.
  const subject = identity.subject;

  let entry = await ctx.db
    .query('allowlist')
    .withIndex('by_subject', (q) => q.eq('subject', subject))
    .unique();

  if (!entry && identity.email) {
    entry = await ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', identity.email!))
      .unique();
  }

  if (!entry) throw new Error('Not on allowlist');
  return { identity, isAdmin: entry.isAdmin };
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { identity, isAdmin } = await requireAuth(ctx);
  if (!isAdmin) throw new Error('Admin required');
  return identity;
}
