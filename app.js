const { createServer } = require('./server/create-server');
const { seedUsers } = require('./src/data/seed-users');
const { UserService } = require('./src/services/user-service');

const PORT = Number.parseInt(process.env.PORT ?? '3333', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

const userService = new UserService({
  seedUsers,
  delayMs: 350,
  failRate: 0,
  pageSize: 6
});

const server = createServer({ userService });

server.listen(PORT, HOST, () => {
  console.log(`Fake API running at http://${HOST}:${PORT}`);
});

module.exports = {
  server
};