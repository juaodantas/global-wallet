import type { FastifyInstance } from 'fastify';
import { loginRequestSchema, registerRequestSchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { toUserId } from '../../../shared/domain/ids.js';
import { parseBody } from '../../../shared/http/parse-body.js';
import type { AuthService } from '../application/auth-service.js';
import { clearSessionCookie, getSessionUserId, setSessionCookie } from './session.js';

export async function registerAuthRoutes(app: FastifyInstance, dependencies: { authService: AuthService; env: AppEnv }): Promise<void> {
  app.post('/auth/register', async (request, reply) => {
    const input = parseBody(registerRequestSchema, request.body);
    const session = await dependencies.authService.register(input);
    setSessionCookie(reply, toUserId(session.user.userId), dependencies.env);
    return reply.status(201).send(session);
  });

  app.post('/auth/login', async (request, reply) => {
    const input = parseBody(loginRequestSchema, request.body);
    const session = await dependencies.authService.login(input);
    setSessionCookie(reply, toUserId(session.user.userId), dependencies.env);
    return reply.status(200).send(session);
  });

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, dependencies.env);
    return reply.status(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const session = await dependencies.authService.getCurrentUser(userId);
    return reply.status(200).send(session);
  });
}
