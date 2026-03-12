/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';
import { api } from '../_generated/api';

const modules = import.meta.glob('../**/*.*s');

test('requireAuth throws when not on allowlist', async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.withIdentity({ email: 'notallowed@example.com' }).query(api.allowlist.list)
  ).rejects.toThrow();
});

test('allowlisted user with email can access protected queries', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'member@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });

  await expect(t.withIdentity({ email: 'member@example.com' }).query(api.vehicles.list)).resolves.toEqual([]);
});

test('requireAuth throws when authenticated user has no email claim', async () => {
  const t = convexTest(schema, modules);

  await expect(t.withIdentity({}).query(api.vehicles.list)).rejects.toThrow(
    'Authenticated user is missing email claim',
  );
});

test('admin can list allowlist entries', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'admin@example.com',
      isAdmin: true,
      addedAt: Date.now(),
    });
  });
  const entries = await t
    .withIdentity({ email: 'admin@example.com' })
    .query(api.allowlist.list);
  expect(entries).toHaveLength(1);
});
