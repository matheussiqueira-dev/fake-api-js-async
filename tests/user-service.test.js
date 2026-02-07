const test = require('node:test');
const assert = require('node:assert/strict');

const { seedUsers } = require('../src/data/seed-users');
const { UserService } = require('../src/services/user-service');

function createService() {
  return new UserService({
    seedUsers,
    delayMs: 0,
    failRate: 0,
    pageSize: 3
  });
}

test('listUsers returns paginated results and metadata', async () => {
  const service = createService();
  const result = await service.listUsers({ page: 1, limit: 3, sortBy: 'id', sortOrder: 'asc' });

  assert.equal(result.data.length, 3);
  assert.equal(result.meta.totalItems, seedUsers.length);
  assert.equal(result.meta.totalPages, 3);
});

test('createUser rejects invalid email', async () => {
  const service = createService();

  await assert.rejects(
    () => service.createUser({ name: 'Teste', email: 'email-invalido' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('createUser rejects duplicated email', async () => {
  const service = createService();

  await assert.rejects(
    () => service.createUser({ name: 'Duplicado', email: 'alice.johnson@example.com' }),
    { code: 'CONFLICT' }
  );
});

test('updateUser updates fields of existing user', async () => {
  const service = createService();
  const updated = await service.updateUser(2, { name: 'Bruno Atualizado' });

  assert.equal(updated.id, 2);
  assert.equal(updated.name, 'Bruno Atualizado');
  assert.equal(updated.email, 'bruno.lima@example.com');
});

test('deleteUser removes existing user and throws for missing id', async () => {
  const service = createService();

  const deleted = await service.deleteUser(3);
  assert.match(deleted.message, /deleted successfully/i);

  await assert.rejects(
    () => service.deleteUser(300),
    { code: 'NOT_FOUND' }
  );
});

test('getStats returns aggregate indicators', async () => {
  const service = createService();
  const stats = await service.getStats();

  assert.equal(stats.totalUsers, seedUsers.length);
  assert.equal(stats.activeUsers, seedUsers.length);
  assert.equal(stats.deletedUsers, 0);
  assert.ok(Array.isArray(stats.topDomains));
  assert.ok(Array.isArray(stats.recentUsers));
});

test('soft delete removes user from default listing and restore adds it back', async () => {
  const service = createService();

  await service.deleteUser(2);
  const withoutDeleted = await service.listUsers({ page: 1, limit: 20, sortBy: 'id' });
  assert.equal(withoutDeleted.data.some((user) => user.id === 2), false);

  const withDeleted = await service.listUsers({ page: 1, limit: 20, sortBy: 'id', includeDeleted: true }, { includeDeleted: true });
  assert.equal(withDeleted.data.some((user) => user.id === 2), true);

  await service.restoreUser(2);
  const restored = await service.listUsers({ page: 1, limit: 20, sortBy: 'id' });
  assert.equal(restored.data.some((user) => user.id === 2), true);
});

test('bulkCreateUsers creates records and skips duplicates when enabled', async () => {
  const service = createService();

  const result = await service.bulkCreateUsers([
    { name: 'Nova Pessoa', email: 'nova.pessoa@example.com' },
    { name: 'Duplicado', email: 'alice.johnson@example.com' }
  ], { skipDuplicates: true });

  assert.equal(result.summary.requested, 2);
  assert.equal(result.summary.created, 1);
  assert.equal(result.summary.skipped, 1);
});
