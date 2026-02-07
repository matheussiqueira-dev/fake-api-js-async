const { createServer } = require('./server/create-server');
const { createAppContext } = require('./src/bootstrap/create-app-context');

const PORT = Number.parseInt(process.env.PORT ?? '3333', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

const appContext = createAppContext();
const server = createServer(appContext);

server.listen(PORT, HOST, () => {
  console.log(`Fake API running at http://${HOST}:${PORT}`);
  console.log(`API docs: http://${HOST}:${PORT}/api/v1/openapi.json`);
  console.log('Default users: admin/Admin@123, editor/Editor@123, viewer/Viewer@123');
});

module.exports = {
  server,
  appContext
};
