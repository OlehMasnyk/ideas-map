import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { createRateLimiters, defaultRateLimits, type RateLimitSettings } from './rateLimits.js';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { demandRouter } from './routes/demand.js';
import { requestsRouter } from './routes/requests.js';

export interface AppOptions {
  /** Pass `false` to disable rate limiting (e.g. in tests). */
  rateLimits?: RateLimitSettings | false;
}

const passThrough: RequestHandler = (_req, _res, next) => next();

export function createApp({ rateLimits = defaultRateLimits }: AppOptions = {}) {
  const limits = rateLimits
    ? createRateLimiters(rateLimits)
    : { api: passThrough, auth: passThrough, createRequest: passThrough };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(limits.api);
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.post(['/auth/login', '/auth/register'], limits.auth);
  api.use('/auth', authRouter);
  api.use('/categories', categoriesRouter);
  api.post('/requests', limits.createRequest);
  api.use('/requests', requestsRouter);
  api.use('/demand', demandRouter);
  api.use(notFoundHandler);
  app.use('/api', api);

  const webDist = config.webDistDir ?? path.resolve(import.meta.dirname, '../../web/dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { index: false }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
