import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

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

export const getEvSyncState = query({
  args: {},
  handler: async (ctx) => {
    const { isAdmin } = await requireAuth(ctx);
    const cred = await ctx.db.query('evCredentials').first();
    return {
      hasCredentials: cred !== null,
      isAdmin,
    };
  },
});
