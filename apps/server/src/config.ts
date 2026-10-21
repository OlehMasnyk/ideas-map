const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET ?? (isProduction ? undefined : 'dev-only-insecure-secret');
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret,
  jwtExpiresInSeconds: 60 * 60 * 24 * 7,
  authCookieName: 'dm_token',
  webDistDir: process.env.WEB_DIST_DIR,
};
