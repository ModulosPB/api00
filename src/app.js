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

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use(express.static(publicDir));

  app.use('/api', rootRouter);
  app.use('/api/cocktails', cocktailsRouter);
  app.use('/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
