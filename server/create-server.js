const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const { assertRole } = require('../src/security/access-control');
const {
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError
} = require('../src/lib/errors');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const STARTED_AT = Date.now();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function createServer(context) {
  assertRequiredContext(context);

  return http.createServer(async (request, response) => {
    const requestId = randomUUID();
    const startTime = Date.now();

    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://localhost');
    const pathname = url.pathname;
    const isApiRoute = pathname.startsWith('/api/');

    const requestContext = {
      requestId,
      startTime,
      method,
      pathname,
      url,
      ip: getClientIp(request),
      statusCode: 500,
      route: 'unmatched',
      authUser: null,
      rateLimitInfo: null
    };

    try {
      applyBaseSecurityHeaders(response);

      if (isApiRoute) {
        applyCorsHeaders(request, response, context.appConfig.cors.allowedOrigins);
      }

      if (method === 'OPTIONS' && isApiRoute) {
        response.writeHead(204);
        response.end();
        requestContext.statusCode = 204;
        requestContext.route = 'OPTIONS *';
        return;
      }

      if (isApiRoute) {
        applyRateLimit(context, requestContext, response);
      }

      await withTimeout(handleRequest(context, request, response, requestContext), context.appConfig.requestTimeoutMs);
    } catch (error) {
      requestContext.statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      sendError(response, error, requestContext);

      context.logger.error({
        requestId,
        method,
        path: pathname,
        statusCode: requestContext.statusCode,
        errorCode: error?.code ?? 'INTERNAL_ERROR',
        errorMessage: error?.message ?? 'Unknown error'
      });
    } finally {
      const durationMs = Date.now() - startTime;

      context.metricsRegistry.recordRequest({
        method,
        route: requestContext.route,
        statusCode: requestContext.statusCode,
        durationMs
      });

      context.logger.log({
        requestId,
        method,
        path: pathname,
        route: requestContext.route,
        statusCode: requestContext.statusCode,
        durationMs,
        ip: requestContext.ip,
        user: requestContext.authUser?.username ?? null
      });
    }
  });
}

function assertRequiredContext(context) {
  const requiredKeys = [
    'appConfig',
    'userService',
    'authService',
    'auditService',
    'metricsRegistry',
    'rateLimiter',
    'logger'
  ];

  for (const key of requiredKeys) {
    if (!context?.[key]) {
      throw new Error(`createServer requires ${key} in context.`);
    }
  }
}

async function handleRequest(context, request, response, requestContext) {
  if (requestContext.pathname.startsWith('/api/v1/')) {
    await handleApiV1(context, request, response, requestContext);
    return;
  }

  if (requestContext.pathname.startsWith('/api/')) {
    await handleLegacyApi(context, request, response, requestContext);
    return;
  }

  const staticResult = await serveStaticFile(response, requestContext.pathname);
  requestContext.statusCode = staticResult.statusCode;
  requestContext.route = staticResult.route;
}

async function handleLegacyApi(context, request, response, requestContext) {
  const { method, pathname, url } = requestContext;

  response.setHeader('Deprecation', 'true');
  response.setHeader('Sunset', 'Mon, 31 Aug 2026 23:59:59 GMT');
  response.setHeader('Link', '</api/v1/openapi.json>; rel="successor-version"');

  if (method === 'GET' && pathname === '/api/health') {
    requestContext.route = 'GET /api/health';
    requestContext.statusCode = 200;

    sendJson(response, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000)
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/users') {
    requestContext.route = 'GET /api/users';

    const result = await context.userService.listUsers({
      search: url.searchParams.get('search') ?? '',
      sortBy: url.searchParams.get('sortBy') ?? 'name',
      sortOrder: url.searchParams.get('sortOrder') ?? 'asc',
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? context.appConfig.defaultPageSize
    });

    requestContext.statusCode = 200;
    sendJson(response, 200, result);
    return;
  }

  if (method === 'POST' && pathname === '/api/users') {
    requestContext.route = 'POST /api/users';

    const body = await readJsonBody(request, context.appConfig.maxBodyBytes);
    const result = await context.userService.createUser(body);

    context.auditService.record({
      action: 'legacy.user.create',
      actor: 'anonymous',
      requestId: requestContext.requestId,
      metadata: { userId: result.id }
    });

    requestContext.statusCode = 201;
    sendJson(response, 201, result);
    return;
  }

  if (method === 'GET' && pathname === '/api/stats') {
    requestContext.route = 'GET /api/stats';
    const stats = await context.userService.getStats();

    requestContext.statusCode = 200;
    sendJson(response, 200, stats);
    return;
  }

  const userRouteMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userRouteMatch) {
    const userId = userRouteMatch[1];

    if (method === 'PUT') {
      requestContext.route = 'PUT /api/users/:id';

      const body = await readJsonBody(request, context.appConfig.maxBodyBytes);
      const updated = await context.userService.updateUser(userId, body);

      context.auditService.record({
        action: 'legacy.user.update',
        actor: 'anonymous',
        requestId: requestContext.requestId,
        metadata: { userId: updated.id }
      });

      requestContext.statusCode = 200;
      sendJson(response, 200, updated);
      return;
    }

    if (method === 'DELETE') {
      requestContext.route = 'DELETE /api/users/:id';
      const deleted = await context.userService.deleteUser(userId);

      context.auditService.record({
        action: 'legacy.user.delete',
        actor: 'anonymous',
        requestId: requestContext.requestId,
        metadata: { userId: Number.parseInt(userId, 10) }
      });

      requestContext.statusCode = 200;
      sendJson(response, 200, deleted);
      return;
    }
  }

  throw routeNotFoundError(method, pathname);
}

async function handleApiV1(context, request, response, requestContext) {
  const { method, pathname, url } = requestContext;

  if (method === 'GET' && pathname === '/api/v1/openapi.json') {
    requestContext.route = 'GET /api/v1/openapi.json';
    requestContext.statusCode = 200;
    sendJson(response, 200, createOpenApiDocument());
    return;
  }

  if (method === 'GET' && pathname === '/api/v1/health') {
    requestContext.route = 'GET /api/v1/health';
    requestContext.statusCode = 200;

    sendJson(response, 200, {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
        version: 'v1'
      },
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    requestContext.route = 'POST /api/v1/auth/login';

    const body = await readJsonBody(request, context.appConfig.maxBodyBytes);
    const authResult = context.authService.login(body);

    context.auditService.record({
      action: 'auth.login',
      actor: authResult.user.username,
      requestId: requestContext.requestId,
      metadata: { role: authResult.user.role }
    });

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: authResult,
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  const authUser = authenticateRequest(context, request);
  requestContext.authUser = authUser;

  if (method === 'GET' && pathname === '/api/v1/auth/me') {
    requestContext.route = 'GET /api/v1/auth/me';
    requestContext.statusCode = 200;

    sendJson(response, 200, {
      data: {
        id: authUser.id,
        username: authUser.username,
        role: authUser.role,
        displayName: authUser.displayName
      },
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/v1/users') {
    requestContext.route = 'GET /api/v1/users';

    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    if (includeDeleted) {
      assertRole(authUser, 'admin');
    }

    const result = await context.userService.listUsers({
      search: url.searchParams.get('search') ?? '',
      sortBy: url.searchParams.get('sortBy') ?? 'name',
      sortOrder: url.searchParams.get('sortOrder') ?? 'asc',
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? context.appConfig.defaultPageSize,
      includeDeleted
    }, {
      includeDeleted
    });

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: result.data,
      meta: {
        ...result.meta,
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/v1/users') {
    requestContext.route = 'POST /api/v1/users';
    assertRole(authUser, 'editor');

    const body = await readJsonBody(request, context.appConfig.maxBodyBytes);
    const created = await context.userService.createUser(body);

    context.auditService.record({
      action: 'user.create',
      actor: authUser.username,
      requestId: requestContext.requestId,
      metadata: { userId: created.id }
    });

    requestContext.statusCode = 201;
    sendJson(response, 201, {
      data: created,
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/v1/users/bulk') {
    requestContext.route = 'POST /api/v1/users/bulk';
    assertRole(authUser, 'admin');

    const body = await readJsonBody(request, context.appConfig.maxBodyBytes);

    if (!Array.isArray(body?.users)) {
      throw new ValidationError('Body must contain users array.');
    }

    const skipDuplicates = body.skipDuplicates !== false;
    const result = await context.userService.bulkCreateUsers(body.users, { skipDuplicates });

    context.auditService.record({
      action: 'user.bulk_create',
      actor: authUser.username,
      requestId: requestContext.requestId,
      metadata: result.summary
    });

    requestContext.statusCode = 201;
    sendJson(response, 201, {
      data: result,
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/v1/stats') {
    requestContext.route = 'GET /api/v1/stats';

    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
    if (includeDeleted) {
      assertRole(authUser, 'admin');
    }

    const result = await context.userService.getStats({ includeDeleted });

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: result,
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/v1/audit-logs') {
    requestContext.route = 'GET /api/v1/audit-logs';
    assertRole(authUser, 'admin');

    const page = parseIntOr(url.searchParams.get('page'), 1);
    const limit = parseIntOr(url.searchParams.get('limit'), 20);

    const result = context.auditService.list({ page, limit });

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: result.data,
      meta: {
        ...result.meta,
        requestId: requestContext.requestId
      }
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/v1/metrics') {
    requestContext.route = 'GET /api/v1/metrics';
    assertRole(authUser, 'admin');

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: context.metricsRegistry.snapshot(),
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  const userRestoreRoute = pathname.match(/^\/api\/v1\/users\/(\d+)\/restore$/);
  if (userRestoreRoute && method === 'POST') {
    requestContext.route = 'POST /api/v1/users/:id/restore';
    assertRole(authUser, 'admin');

    const restored = await context.userService.restoreUser(userRestoreRoute[1]);

    context.auditService.record({
      action: 'user.restore',
      actor: authUser.username,
      requestId: requestContext.requestId,
      metadata: { userId: restored.id }
    });

    requestContext.statusCode = 200;
    sendJson(response, 200, {
      data: restored,
      meta: {
        requestId: requestContext.requestId
      }
    });
    return;
  }

  const userIdRoute = pathname.match(/^\/api\/v1\/users\/(\d+)$/);
  if (userIdRoute) {
    const userId = userIdRoute[1];

    if (method === 'GET') {
      requestContext.route = 'GET /api/v1/users/:id';

      const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
      if (includeDeleted) {
        assertRole(authUser, 'admin');
      }

      const result = await context.userService.getUserById(userId, { includeDeleted });

      requestContext.statusCode = 200;
      sendJson(response, 200, {
        data: result,
        meta: {
          requestId: requestContext.requestId
        }
      });
      return;
    }

    if (method === 'PUT') {
      requestContext.route = 'PUT /api/v1/users/:id';
      assertRole(authUser, 'editor');

      const body = await readJsonBody(request, context.appConfig.maxBodyBytes);
      const updated = await context.userService.updateUser(userId, body);

      context.auditService.record({
        action: 'user.update',
        actor: authUser.username,
        requestId: requestContext.requestId,
        metadata: { userId: updated.id }
      });

      requestContext.statusCode = 200;
      sendJson(response, 200, {
        data: updated,
        meta: {
          requestId: requestContext.requestId
        }
      });
      return;
    }

    if (method === 'DELETE') {
      requestContext.route = 'DELETE /api/v1/users/:id';
      assertRole(authUser, 'admin');

      const deleted = await context.userService.deleteUser(userId);

      context.auditService.record({
        action: 'user.delete',
        actor: authUser.username,
        requestId: requestContext.requestId,
        metadata: { userId: Number.parseInt(userId, 10) }
      });

      requestContext.statusCode = 200;
      sendJson(response, 200, {
        data: deleted,
        meta: {
          requestId: requestContext.requestId
        }
      });
      return;
    }
  }

  throw routeNotFoundError(method, pathname);
}

function applyRateLimit(context, requestContext, response) {
  const result = context.rateLimiter.consume(requestContext.ip);

  requestContext.rateLimitInfo = result;
  response.setHeader('X-RateLimit-Limit', String(result.limit));
  response.setHeader('X-RateLimit-Remaining', String(result.remaining));
  response.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

  if (!result.allowed) {
    response.setHeader('Retry-After', String(result.retryAfterSeconds));
    throw new TooManyRequestsError('Rate limit exceeded. Please retry later.');
  }
}

function authenticateRequest(context, request) {
  const header = request.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    throw new UnauthorizedError('Bearer token is required.');
  }

  return context.authService.authenticateAccessToken(token);
}

function applyBaseSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
}

function applyCorsHeaders(request, response, allowedOrigins) {
  const requestOrigin = request.headers.origin;

  if (!requestOrigin) {
    return;
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    throw new ForbiddenError('Origin is not allowed by CORS policy.');
  }

  response.setHeader('Access-Control-Allow-Origin', requestOrigin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.setHeader('Access-Control-Max-Age', '600');
}

async function readJsonBody(request, maxBytes) {
  const contentType = request.headers['content-type'] ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const error = new ValidationError('Content-Type must be application/json.');
    error.statusCode = 415;
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw error;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      const error = new ValidationError('Payload too large.');
      error.statusCode = 413;
      error.code = 'PAYLOAD_TOO_LARGE';
      throw error;
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    throw new ValidationError('Malformed JSON body.');
  }
}

async function serveStaticFile(response, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, {
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied.'
      }
    });
    return {
      statusCode: 403,
      route: `STATIC ${pathname}`
    };
  }

  try {
    const file = await fs.readFile(safePath);
    const extension = path.extname(safePath);

    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });

    response.end(file);
    return {
      statusCode: 200,
      route: `STATIC ${pathname}`
    };
  } catch {
    sendJson(response, 404, {
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found.'
      }
    });
    return {
      statusCode: 404,
      route: `STATIC ${pathname}`
    };
  }
}

function sendJson(response, statusCode, payload) {
  if (response.writableEnded) {
    return;
  }

  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  response.end(JSON.stringify(payload));
}

function sendError(response, error, requestContext) {
  if (response.writableEnded) {
    return;
  }

  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500
    ? 'Unexpected server error.'
    : error?.message ?? 'Request failed.';

  sendJson(response, statusCode, {
    error: {
      code: error?.code ?? 'INTERNAL_ERROR',
      message,
      details: error?.details ?? null
    },
    meta: {
      requestId: requestContext.requestId,
      timestamp: new Date().toISOString()
    }
  });
}

function routeNotFoundError(method, pathname) {
  const error = new Error(`Route ${method} ${pathname} not found.`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  return error;
}

function parseIntOr(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return request.socket.remoteAddress ?? 'unknown';
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error('Request timed out.');
      timeoutError.statusCode = 503;
      timeoutError.code = 'REQUEST_TIMEOUT';
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function createOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Fake API JS Async',
      version: '1.0.0',
      description: 'Versioned backend API with RBAC, audit logs and metrics.'
    },
    servers: [
      {
        url: '/api/v1'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths: {
      '/health': {
        get: { summary: 'Health check' }
      },
      '/auth/login': {
        post: { summary: 'Authenticate and issue bearer token' }
      },
      '/auth/me': {
        get: {
          summary: 'Get authenticated user profile',
          security: [{ bearerAuth: [] }]
        }
      },
      '/users': {
        get: {
          summary: 'List users with pagination and filters',
          security: [{ bearerAuth: [] }]
        },
        post: {
          summary: 'Create user (editor+)',
          security: [{ bearerAuth: [] }]
        }
      },
      '/users/bulk': {
        post: {
          summary: 'Bulk create users (admin)',
          security: [{ bearerAuth: [] }]
        }
      },
      '/users/{id}': {
        get: {
          summary: 'Get user by id',
          security: [{ bearerAuth: [] }]
        },
        put: {
          summary: 'Update user (editor+)',
          security: [{ bearerAuth: [] }]
        },
        delete: {
          summary: 'Soft delete user (admin)',
          security: [{ bearerAuth: [] }]
        }
      },
      '/users/{id}/restore': {
        post: {
          summary: 'Restore soft deleted user (admin)',
          security: [{ bearerAuth: [] }]
        }
      },
      '/stats': {
        get: {
          summary: 'Get user statistics',
          security: [{ bearerAuth: [] }]
        }
      },
      '/audit-logs': {
        get: {
          summary: 'List audit events (admin)',
          security: [{ bearerAuth: [] }]
        }
      },
      '/metrics': {
        get: {
          summary: 'Get API metrics snapshot (admin)',
          security: [{ bearerAuth: [] }]
        }
      }
    }
  };
}

module.exports = {
  createServer
};
