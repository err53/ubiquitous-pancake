import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';

// Internal: get raw credential row
export const getCredentialRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('evCredentials').first();
  },
});

// Internal: insert new credential
export const insertCredential = internalMutation({
  args: { ciphertext: v.string(), iv: v.string(), authTag: v.string() },
  handler: async (ctx, { ciphertext, iv, authTag }) => {
    await ctx.db.insert('evCredentials', {
      provider: 'tessie',
      encryptedToken: ciphertext,
      iv,
      authTag,
      lastUpdatedAt: Date.now(),
    });
  },
});

// Internal: update existing credential
export const updateCredential = internalMutation({
  args: { id: v.id('evCredentials'), ciphertext: v.string(), iv: v.string(), authTag: v.string() },
  handler: async (ctx, { id, ciphertext, iv, authTag }) => {
    await ctx.db.patch(id, {
      encryptedToken: ciphertext,
      iv,
      authTag,
      lastUpdatedAt: Date.now(),
    });
  },
});

// Internal: check user role by WorkOS user ID (subject)
export const getUserRole = internalQuery({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    return ctx.db.query('allowlist').withIndex('by_subject', (q) => q.eq('subject', subject)).unique();
  },
});

// Public query: check if credentials are configured (for UI)
export const hasEvCredentials = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const cred = await ctx.db.query('evCredentials').first();
    return cred !== null;
  },
});
