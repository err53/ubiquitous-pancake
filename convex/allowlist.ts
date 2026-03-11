import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';

// Returns the current user's WorkOS subject (user ID) and email (if in JWT).
// Used for bootstrapping — no auth required so unauthenticated users can see their ID.
export const getMyIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { subject: identity.subject, email: identity.email ?? null };
  },
});

// Returns role for the current user (used to gate admin nav link).
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
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
  args: { email: v.string(), subject: v.optional(v.string()), isAdmin: v.boolean() },
  handler: async (ctx, { email, subject, isAdmin }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (existing) throw new Error('Email already on allowlist');
    await ctx.db.insert('allowlist', { email, subject, isAdmin, addedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('allowlist') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
