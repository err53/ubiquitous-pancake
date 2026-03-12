/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.*s');

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'admin@example.com',
      isAdmin: true,
      addedAt: Date.now(),
    });
  });
  return t.withIdentity({ email: 'admin@example.com' });
}

test('add inserts an email-only allowlist row', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedAdmin(t);

  await admin.mutation(api.allowlist.add, {
    email: 'user@example.com',
    isAdmin: false,
  });

  const entries = await admin.query(api.allowlist.list);
  expect(entries).toHaveLength(2);
  expect(entries.find((entry) => entry.email === 'user@example.com')).toMatchObject({
    email: 'user@example.com',
    isAdmin: false,
  });
});

test('add rejects duplicate email entries', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedAdmin(t);

  await expect(
    admin.mutation(api.allowlist.add, {
      email: 'admin@example.com',
      isAdmin: false,
    }),
  ).rejects.toThrow('Email already on allowlist');
});

test('getMyRole resolves by email only', async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'member@example.com',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });

  await expect(
    t.withIdentity({ email: 'member@example.com' }).query(api.allowlist.getMyRole),
  ).resolves.toEqual({ isAdmin: false });
});

test('getMyEmail returns the signed-in email', async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.withIdentity({ email: 'member@example.com' }).query(api.allowlist.getMyEmail),
  ).resolves.toEqual({ email: 'member@example.com' });
});

test('cleanupLegacySubjects removes stored subject fields', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedAdmin(t);

  const legacyId = await t.run(async (ctx) => {
    return ctx.db.insert('allowlist', {
      email: 'legacy@example.com',
      subject: 'user_123',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });

  await expect(admin.mutation(api.allowlist.cleanupLegacySubjects, {})).resolves.toEqual({ cleaned: 2 });

  const legacyEntry = await t.run(async (ctx) => ctx.db.get(legacyId));
  expect(legacyEntry).toBeTruthy();
  expect(legacyEntry?.email).toBe('legacy@example.com');
  expect(legacyEntry?.isAdmin).toBe(false);
  expect('subject' in (legacyEntry ?? {})).toBe(false);
});

test('cleanupLegacySubjects fails fast when duplicate emails exist', async () => {
  const t = convexTest(schema, modules);
  const admin = await seedAdmin(t);

  await t.run(async (ctx) => {
    await ctx.db.insert('allowlist', {
      email: 'duplicate@example.com',
      subject: 'first',
      isAdmin: false,
      addedAt: Date.now(),
    });
    await ctx.db.insert('allowlist', {
      email: 'duplicate@example.com',
      subject: 'second',
      isAdmin: false,
      addedAt: Date.now(),
    });
  });

  await expect(admin.mutation(api.allowlist.cleanupLegacySubjects, {})).rejects.toThrow(
    'Duplicate allowlist email found: duplicate@example.com',
  );
});
