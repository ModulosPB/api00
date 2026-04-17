import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import rootRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import cocktailsRouter from './routes/cocktails.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`,
    );
  });
  next();
}

export function createApp({ logRequests = process.env.NODE_ENV !== 'test' } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  if (logRequests) {
    app.use(requestLogger);
  }

  app.use(express.static(publicDir));

  app.use('/api', rootRouter);
  app.use('/api/cocktails', cocktailsRouter);
  app.use('/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
