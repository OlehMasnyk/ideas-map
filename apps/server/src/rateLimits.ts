import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { ApiError } from '@ideas-map/shared';

export interface RateLimitSettings {
  /** All API calls, per IP per minute. */
  apiPerMinute: number;
  /** Login/register attempts, per IP per 15 minutes. */
  authPer15Minutes: number;
  /** New demand requests, per IP per hour. */
  createRequestPerHour: number;
}

export const defaultRateLimits: RateLimitSettings = {
  apiPerMinute: 300,
  authPer15Minutes: 20,
  createRequestPerHour: 30,
};

function limiter(limit: number, windowMs: number, message: string): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message } satisfies ApiError,
  });
}

export function createRateLimiters(settings: RateLimitSettings) {
  return {
    api: limiter(settings.apiPerMinute, 60_000, 'Too many requests, slow down a little'),
    auth: limiter(
      settings.authPer15Minutes,
      15 * 60_000,
      'Too many sign-in attempts, try again later',
    ),
    createRequest: limiter(
      settings.createRequestPerHour,
      60 * 60_000,
      'Too many new requests from this network, try again later',
    ),
  };
}
