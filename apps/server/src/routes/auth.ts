import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { credentialsSchema, type PublicUser } from '@ideas-map/shared';
import { prisma } from '../db.js';
import { HttpError } from '../errors.js';
import { clearAuthCookie, getUserIdFromRequest, setAuthCookie } from '../auth.js';

const BCRYPT_ROUNDS = 10;

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password } = credentialsSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });
    setAuthCookie(res, user.id);
    res.status(201).json(user satisfies PublicUser);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'An account with this email already exists');
    }
    throw err;
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  setAuthCookie(res, user.id);
  res.json({ id: user.id, email: user.email } satisfies PublicUser);
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', async (req, res) => {
  const userId = getUserIdFromRequest(req);
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
    : null;
  res.json(user satisfies PublicUser | null);
});
