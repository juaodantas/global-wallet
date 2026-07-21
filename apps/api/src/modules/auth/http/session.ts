import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppEnv } from '../../../shared/config/env.js';
import { toUserId } from '../../../shared/domain/ids.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { UserId } from '../domain/types.js';

export const sessionCookieName = 'gw_session';

const sessionPayloadSchema = z.object({
  sub: z.string().uuid(),
  iat: z.number().int(),
  exp: z.number().int()
});

const sessionHeaderSchema = z.object({
  alg: z.literal('HS256'),
  typ: z.literal('JWT').optional()
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function parseJsonObject(encoded: string): unknown {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}

export function createSessionJwt(userId: UserId, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({ sub: userId, iat: now, exp: now + 60 * 60 * 24 * 7 });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifySessionJwt(token: string, secret: string): UserId {
  const parts = token.split('.');
  if (parts.length !== 3) throw unauthorized();
  const header = parts[0];
  const payload = parts[1];
  const signature = parts[2];
  if (!header || !payload || !signature) throw unauthorized();
  const parsedHeader = sessionHeaderSchema.safeParse(parseJsonObject(header));
  if (!parsedHeader.success) throw unauthorized();
  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw unauthorized();
  const parsed = sessionPayloadSchema.safeParse(parseJsonObject(payload));
  if (!parsed.success || parsed.data.exp <= Math.floor(Date.now() / 1000)) throw unauthorized();
  return toUserId(parsed.data.sub);
}

export function setSessionCookie(reply: FastifyReply, userId: UserId, env: AppEnv): void {
  reply.setCookie(sessionCookieName, createSessionJwt(userId, env.JWT_SECRET), cookieOptions(env));
}

export function clearSessionCookie(reply: FastifyReply, env: AppEnv): void {
  reply.clearCookie(sessionCookieName, cookieOptions(env));
}

export function getSessionUserId(request: FastifyRequest, env: AppEnv): UserId {
  const token = request.cookies[sessionCookieName];
  if (!token) throw unauthorized();
  try {
    return verifySessionJwt(token, env.JWT_SECRET);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw unauthorized();
  }
}

function cookieOptions(env: AppEnv) {
  return { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test' };
}

function unauthorized(): AppError {
  return new AppError({ code: 'UNAUTHORIZED', message: 'Unauthorized', statusCode: 401 });
}
