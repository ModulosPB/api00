import express from 'express';
import rootRouter from './routes/index.js';
import healthRouter from './routes/health.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.use('/', rootRouter);
  app.use('/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
