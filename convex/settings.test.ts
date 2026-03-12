/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

test('getEvSyncState reports missing credentials for admins', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'admin@example.com',
      isAdmin: true,
      addedAt: Date.now(),
    });
  });

  await expect(
    t.withIdentity({ email: 'admin@example.com' }).query(api.settings.getEvSyncState),
  ).resolves.toEqual({
    hasCredentials: false,
    isAdmin: true,
  });
});

test('getEvSyncState reports configured credentials for non-admins', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'member@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
    await ctx.db.insert('evCredentials', {
      provider: 'tessie',
      encryptedToken: 'ciphertext',
      iv: 'iv',
      authTag: 'tag',
      lastUpdatedAt: Date.now(),
    });
  });

  await expect(
    t.withIdentity({ email: 'member@example.com' }).query(api.settings.getEvSyncState),
  ).resolves.toEqual({
    hasCredentials: true,
    isAdmin: false,
  });
});
