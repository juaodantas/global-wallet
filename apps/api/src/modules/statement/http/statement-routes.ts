import type { FastifyInstance } from 'fastify';
import { statementQuerySchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { getSessionUserId } from '../../auth/http/session.js';
import type { StatementService } from '../application/statement-service.js';

export async function registerStatementRoutes(app: FastifyInstance, dependencies: { statementService: StatementService; env: AppEnv }): Promise<void> {
  app.get('/statement', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const query = statementQuerySchema.parse(request.query);
    const result = await dependencies.statementService.list(userId, query);
    return reply.status(200).send(result);
  });

  app.get<{ Params: { operationId: string } }>('/statement/:operationId', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const detail = await dependencies.statementService.getDetail(userId, request.params.operationId);
    return reply.status(200).send(detail);
  });
}
