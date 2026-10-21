import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import type { ApiError } from '@ideas-map/shared';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' } satisfies ApiError);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    const { fieldErrors, formErrors } = z.flattenError(err);
    const details: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(fieldErrors) as [string, string[] | undefined][]) {
      if (messages?.length) details[key] = messages;
    }
    if (formErrors.length) details._ = formErrors;
    res.status(400).json({ error: 'Validation failed', details } satisfies ApiError);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message } satisfies ApiError);
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' } satisfies ApiError);
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' } satisfies ApiError);
};
