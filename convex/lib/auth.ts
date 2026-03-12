import { QueryCtx, MutationCtx } from '../_generated/server';

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  return { identity };
}
