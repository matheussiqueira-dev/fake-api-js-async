const { seedUsers } = require('./src/data/seed-users');
const { UserService } = require('./src/services/user-service');

const userService = new UserService({
  seedUsers,
  delayMs: 450,
  failRate: 0,
  pageSize: 100
});

async function getUsers(query = {}) {
  const response = await userService.listUsers({
    page: 1,
    limit: 100,
    ...query
  });

  return response.data;
}

async function createUser(user) {
  return userService.createUser(user);
}

async function updateUser(id, user) {
  return userService.updateUser(id, user);
}

async function deleteUser(id) {
  return userService.deleteUser(id);
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  __service: userService
};