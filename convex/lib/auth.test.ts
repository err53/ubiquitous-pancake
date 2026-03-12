/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';
import { api } from '../_generated/api';

const modules = import.meta.glob('../**/*.*s');

test('requireAuth throws when unauthenticated', async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.vehicles.list)).rejects.toThrow('Unauthenticated');
});

test('authenticated user can access protected queries', async () => {
  const t = convexTest(schema, modules);
  const vehicles = await t.withIdentity({ subject: 'user_admin' }).query(api.vehicles.list);
  expect(vehicles).toEqual([]);
});
