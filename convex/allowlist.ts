import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';

export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) return null;
    const entry = await ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', identity.email!))
      .unique();
    return entry ? { isAdmin: entry.isAdmin } : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query('allowlist').collect();
  },
});

export const add = mutation({
  args: { email: v.string(), isAdmin: v.boolean() },
  handler: async (ctx, { email, isAdmin }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (existing) throw new Error('Email already on allowlist');
    await ctx.db.insert('allowlist', { email, isAdmin, addedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('allowlist') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
