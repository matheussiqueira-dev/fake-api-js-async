const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const { APP_CONFIG } = require('../src/config');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function createServer(options) {
  if (!options?.userService) {
    throw new Error('createServer requires a userService instance.');
  }

  const userService = options.userService;

  return http.createServer(async (request, response) => {
    try {
      const method = request.method ?? 'GET';
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = url.pathname;

      if (pathname.startsWith('/api/')) {
        await handleApiRequest({ request, response, method, url, pathname, userService });
        return;
      }

      await serveStaticFile({ response, pathname });
    } catch (error) {
      sendError(response, error);
    }
  });
}

async function handleApiRequest(context) {
  const { request, response, method, url, pathname, userService } = context;

  if (method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, {
      status: 'ok',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/users') {
    const query = {
      search: url.searchParams.get('search') ?? '',
      sortBy: url.searchParams.get('sortBy') ?? 'name',
      sortOrder: url.searchParams.get('sortOrder') ?? 'asc',
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? APP_CONFIG.defaultPageSize
    };

    const result = await userService.listUsers(query);
    sendJson(response, 200, result);
    return;
  }

  if (method === 'POST' && pathname === '/api/users') {
    const body = await readJsonBody(request, APP_CONFIG.maxBodyBytes);
    const result = await userService.createUser(body);
    sendJson(response, 201, result);
    return;
  }

  if (method === 'GET' && pathname === '/api/stats') {
    const result = await userService.getStats();
    sendJson(response, 200, result);
    return;
  }

  const userRouteMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userRouteMatch) {
    const userId = userRouteMatch[1];

    if (method === 'PUT') {
      const body = await readJsonBody(request, APP_CONFIG.maxBodyBytes);
      const result = await userService.updateUser(userId, body);
      sendJson(response, 200, result);
      return;
    }

    if (method === 'DELETE') {
      const result = await userService.deleteUser(userId);
      sendJson(response, 200, result);
      return;
    }
  }

  sendJson(response, 404, {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${method} ${pathname} not found.`
    }
  });
}

async function readJsonBody(request, maxBytes) {
  const contentType = request.headers['content-type'] ?? '';

  if (!contentType.includes('application/json')) {
    const error = new Error('Content-Type must be application/json.');
    error.statusCode = 415;
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw error;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error('Payload too large.');
      error.statusCode = 413;
      error.code = 'PAYLOAD_TOO_LARGE';
      throw error;
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf-8');

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error('Malformed JSON body.');
    error.statusCode = 400;
    error.code = 'MALFORMED_JSON';
    throw error;
  }
}

async function serveStaticFile(context) {
  const { response } = context;
  const pathname = context.pathname === '/' ? '/index.html' : context.pathname;
  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, {
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied.'
      }
    });
    return;
  }

  try {
    const file = await fs.readFile(safePath);
    const extension = path.extname(safePath);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(file);
  } catch {
    sendJson(response, 404, {
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found.'
      }
    });
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });

  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;

  const message = statusCode >= 500
    ? 'Unexpected server error.'
    : error?.message ?? 'Request failed.';

  sendJson(response, statusCode, {
    error: {
      code: error?.code ?? 'INTERNAL_ERROR',
      message,
      details: error?.details ?? null
    }
  });
}

module.exports = {
  createServer
};