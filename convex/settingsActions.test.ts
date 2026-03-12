/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

process.env.ENCRYPTION_KEY = '11'.repeat(32);

async function seedUser(t: ReturnType<typeof convexTest>, email: string, isAdmin: boolean) {
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email,
      isAdmin,
      addedAt: Date.now(),
    });
  });
  return t.withIdentity({ email });
}

test('admin can save an EV credential using email-only auth', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedUser(t, 'admin@example.com', true);

  await admin.action(api.settingsActions.setEvCredential, { token: 'first-token' });

  const credentials = await t.run(async (ctx) => ctx.db.query('evCredentials').collect());
  expect(credentials).toHaveLength(1);
});

test('non-admin cannot save an EV credential', async () => {
  const t = convexTest(schema, modules);
  const member = await seedUser(t, 'member@example.com', false);

  await expect(member.action(api.settingsActions.setEvCredential, { token: 'denied' })).rejects.toThrow(
    'Admin required',
  );
});

test('saving a credential updates the existing row instead of inserting a duplicate', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedUser(t, 'admin@example.com', true);

  await admin.action(api.settingsActions.setEvCredential, { token: 'first-token' });
  await admin.action(api.settingsActions.setEvCredential, { token: 'second-token' });

  const credentials = await t.run(async (ctx) => ctx.db.query('evCredentials').collect());
  expect(credentials).toHaveLength(1);

  await expect(t.action(internal.settingsActions.getDecryptedToken, {})).resolves.toBe('second-token');
});

test('getDecryptedToken throws when no credentials are configured', async () => {
  const t = convexTest(schema, modules);

  await expect(t.action(internal.settingsActions.getDecryptedToken, {})).rejects.toThrow(
    'No EV credentials configured',
  );
});
