'use strict';

const Sentry = require('@sentry/node');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ---------------------------------------------------------------------------
// Sentry — must be initialised before anything else so it can instrument
// the http server and Socket.IO error handlers.
// ---------------------------------------------------------------------------
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',          // empty string disables SDK
  environment: process.env.ENVIRONMENT || 'development',
  tracesSampleRate: process.env.ENVIRONMENT === 'production' ? 0.2 : 1.0,
  // Tag every event with the service name so errors are filterable in Sentry
  initialScope: {
    tags: { service: 'promethean-realtime' },
  },
});

const PORT = parseInt(process.env.REALTIME_PORT || '3001', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'promethean-realtime' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// ---------------------------------------------------------------------------
// Socket.IO handlers — Sprint 2 will add session rooms, AI streaming, etc.
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[realtime] client disconnected: ${socket.id} (${reason})`);
  });

  // Catch unhandled errors on individual sockets and forward to Sentry
  socket.on('error', (err) => {
    Sentry.captureException(err, {
      tags: { socket_id: socket.id },
    });
    console.error('[realtime] socket error:', err);
  });
});

// Catch-all for uncaught exceptions — Sentry flushes then exits cleanly
process.on('uncaughtException', (err) => {
  Sentry.captureException(err);
  Sentry.flush(2000).then(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason);
  Sentry.flush(2000).then(() => process.exit(1));
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] listening on :${PORT} (env=${process.env.ENVIRONMENT || 'development'})`);
});
