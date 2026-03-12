import { internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';

export const getMyEmail = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { email: identity.email ?? null };
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
  },
});

// Returns role for the current user (used to gate admin nav link).
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email;
    if (!email) return null;

    const entry = await ctx.db
      .query('allowlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    return entry ? { isAdmin: entry.isAdmin } : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const entries = await ctx.db.query('allowlist').collect();
    return entries.map((entry) => ({
      _id: entry._id,
      _creationTime: entry._creationTime,
      email: entry.email,
      isAdmin: entry.isAdmin,
      addedAt: entry.addedAt,
    }));
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

export const cleanupLegacySubjects = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const entries = await ctx.db.query('allowlist').collect();
    const seenEmails = new Set<string>();

    for (const entry of entries) {
      if (!entry.email) throw new Error(`Allowlist entry ${entry._id} is missing an email`);
      if (seenEmails.has(entry.email)) {
        throw new Error(`Duplicate allowlist email found: ${entry.email}`);
      }
      seenEmails.add(entry.email);
    }

    for (const entry of entries) {
      await ctx.db.replace(entry._id, {
        email: entry.email,
        isAdmin: entry.isAdmin,
        addedAt: entry.addedAt,
      });
    }

    return { cleaned: entries.length };
  },
});
