/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

process.env.ENCRYPTION_KEY = '11'.repeat(32);

function authedUser(t: ReturnType<typeof convexTest>, subject = 'user_1') {
  return t.withIdentity({ subject });
}

test('authenticated user can save an EV credential', async () => {
  const t = convexTest(schema, modules);
  const user = authedUser(t);

  await user.action(api.settingsActions.setEvCredential, { token: 'first-token' });

  const credentials = await t.run(async (ctx) => ctx.db.query('evCredentials').collect());
  expect(credentials).toHaveLength(1);
});

test('unauthenticated user cannot save an EV credential', async () => {
  const t = convexTest(schema, modules);

  await expect(t.action(api.settingsActions.setEvCredential, { token: 'denied' })).rejects.toThrow(
    'Unauthenticated',
  );
});

test('saving a credential updates the existing row instead of inserting a duplicate', async () => {
  const t = convexTest(schema, modules);
  const user = authedUser(t);

  await user.action(api.settingsActions.setEvCredential, { token: 'first-token' });
  await user.action(api.settingsActions.setEvCredential, { token: 'second-token' });

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
