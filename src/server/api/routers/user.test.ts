import {describe, expect, it} from 'vitest';
import {randomUUID} from 'crypto';
import * as bcrypt from 'bcrypt';
import {Session} from 'next-auth';
import {getCaller} from '../../../../test/integration/helpers';
import {prismaTest} from '../../../../test/integration/setup';

// The user router resolves "who am I" via session.user.name (used as the id), so
// build sessions from real rows.
const createUser = (canManageUsers: boolean) =>
  prismaTest.user.create({
    data: {
      email: `user-${randomUUID()}@example.com`,
      password: 'hashed',
      canManageUsers,
    },
  });

const sessionFor = (user: {id: string; email: string; canManageUsers: boolean}): Session => ({
  user: {id: user.id, name: user.id, email: user.email, canManageUsers: user.canManageUsers},
  expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

describe('user router permissions', () => {
  describe('without the canManageUsers permission', () => {
    it('forbids listing users', async () => {
      const user = await createUser(false);
      await expect(getCaller(sessionFor(user)).user.getAll()).rejects.toMatchObject({code: 'FORBIDDEN'});
    });

    it('forbids reading another user', async () => {
      const user = await createUser(false);
      const other = await createUser(false);
      await expect(getCaller(sessionFor(user)).user.get(other.id)).rejects.toMatchObject({code: 'FORBIDDEN'});
    });

    it('allows reading your own user', async () => {
      const user = await createUser(false);
      const self = await getCaller(sessionFor(user)).user.get(user.id);
      expect(self.email).toBe(user.email);
    });

    it('forbids creating a user', async () => {
      const user = await createUser(false);
      await expect(
        getCaller(sessionFor(user)).user.add({email: 'x@example.com', password: 'pw', canManageUsers: false}),
      ).rejects.toMatchObject({code: 'FORBIDDEN'});
    });

    it('forbids updating a user', async () => {
      const user = await createUser(false);
      const other = await createUser(false);
      await expect(
        getCaller(sessionFor(user)).user.update({
          id: other.id,
          email: other.email,
          password: '',
          canManageUsers: false,
        }),
      ).rejects.toMatchObject({code: 'FORBIDDEN'});
    });

    it('forbids deleting a user', async () => {
      const user = await createUser(false);
      const other = await createUser(false);
      await expect(getCaller(sessionFor(user)).user.delete(other.id)).rejects.toMatchObject({code: 'FORBIDDEN'});
    });
  });

  describe('with the canManageUsers permission', () => {
    it('lists users', async () => {
      const manager = await createUser(true);
      const list = await getCaller(sessionFor(manager)).user.getAll();
      expect(list.some((u) => u.id === manager.id)).toBe(true);
    });

    it('throws NOT_FOUND for an unknown user id', async () => {
      const manager = await createUser(true);
      await expect(getCaller(sessionFor(manager)).user.get(randomUUID())).rejects.toMatchObject({code: 'NOT_FOUND'});
    });

    it('ignores attempts to change your own management permission', async () => {
      const manager = await createUser(true);
      await getCaller(sessionFor(manager)).user.update({
        id: manager.id,
        email: manager.email,
        password: '',
        canManageUsers: false,
      });

      // The self-edit is allowed, but the permission must stay untouched.
      const after = await prismaTest.user.findUnique({where: {id: manager.id}});
      expect(after?.canManageUsers).toBe(true);
    });

    it('lets you change your own password', async () => {
      const manager = await createUser(true);
      await getCaller(sessionFor(manager)).user.update({
        id: manager.id,
        email: manager.email,
        password: 'new-secret',
        canManageUsers: true,
      });

      const after = await prismaTest.user.findUnique({where: {id: manager.id}});
      expect(await bcrypt.compare('new-secret', after!.password)).toBe(true);
    });

    it('refuses to delete yourself', async () => {
      const manager = await createUser(true);
      await expect(getCaller(sessionFor(manager)).user.delete(manager.id)).rejects.toMatchObject({code: 'FORBIDDEN'});
    });

    it('creates and deletes another user', async () => {
      const manager = await createUser(true);
      const created = await getCaller(sessionFor(manager)).user.add({
        email: `made-${randomUUID()}@example.com`,
        password: 'pw',
        canManageUsers: false,
      });

      await getCaller(sessionFor(manager)).user.delete(created.id);
      expect(await prismaTest.user.findUnique({where: {id: created.id}})).toBeNull();
    });
  });
});
