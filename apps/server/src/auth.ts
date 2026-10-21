import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { HttpError } from './errors.js';

interface TokenPayload {
  sub: string;
}

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
};

export function setAuthCookie(res: Response, userId: string): void {
  const token = jwt.sign({ sub: userId } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresInSeconds,
  });
  res.cookie(config.authCookieName, token, {
    ...cookieOptions,
    maxAge: config.jwtExpiresInSeconds * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(config.authCookieName, cookieOptions);
}

export function getUserIdFromRequest(req: Request): string | null {
  const token: unknown = req.cookies?.[config.authCookieName];
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) throw new HttpError(401, 'Authentication required');
  res.locals.userId = userId;
  next();
};

export function currentUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== 'string') throw new HttpError(401, 'Authentication required');
  return userId;
}
