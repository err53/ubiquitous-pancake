'use node';

import { action, internalAction, ActionCtx } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { encrypt, decrypt } from './lib/crypto';

// Store encrypted Tessie token (admin only)
export const setEvCredential = action({
  args: { token: v.string() },
  handler: async (ctx: ActionCtx, { token }: { token: string }): Promise<void> => {
    // Actions can't directly query db; use internal query
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const subject = identity.subject;
    const role = await ctx.runQuery(internal.settings.getUserRole, { subject });
    if (!role?.isAdmin) throw new Error('Admin required');

    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) throw new Error('ENCRYPTION_KEY environment variable not set');
    const key = Buffer.from(keyHex, 'hex');
    const { ciphertext, iv, authTag } = encrypt(token, key);
    const existing = await ctx.runQuery(internal.settings.getCredentialRaw);
    if (existing) {
      await ctx.runMutation(internal.settings.updateCredential, {
        id: existing._id,
        ciphertext,
        iv,
        authTag,
      });
    } else {
      await ctx.runMutation(internal.settings.insertCredential, { ciphertext, iv, authTag });
    }
  },
});

// Internal: get decrypted token for sync
export const getDecryptedToken = internalAction({
  args: {},
  handler: async (ctx: ActionCtx): Promise<string> => {
    const cred = await ctx.runQuery(internal.settings.getCredentialRaw);
    if (!cred) throw new Error('No EV credentials configured');
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) throw new Error('ENCRYPTION_KEY environment variable not set');
    const key = Buffer.from(keyHex, 'hex');
    return decrypt(cred.encryptedToken, cred.iv, cred.authTag, key);
  },
});
