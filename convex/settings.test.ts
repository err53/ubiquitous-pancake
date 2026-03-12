/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

test('hasEvCredentials reports missing credentials for authenticated users', async () => {
  const t = convexTest(schema, modules);
  await expect(t.withIdentity({ subject: 'user_1' }).query(api.settings.hasEvCredentials)).resolves.toBe(false);
});

test('hasEvCredentials reports configured credentials for authenticated users', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('evCredentials', {
      provider: 'tessie',
      encryptedToken: 'ciphertext',
      iv: 'iv',
      authTag: 'tag',
      lastUpdatedAt: Date.now(),
    });
  });

  await expect(t.withIdentity({ subject: 'user_1' }).query(api.settings.hasEvCredentials)).resolves.toBe(true);
});
