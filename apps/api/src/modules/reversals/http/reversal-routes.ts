import type { FastifyInstance } from 'fastify';
import { reversalRequestSchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { parseBody } from '../../../shared/http/parse-body.js';
import { parseIdempotencyKey } from '../../../shared/http/idempotency.js';
import { getSessionUserId } from '../../auth/http/session.js';
import type { ReversalService } from '../application/reversal-service.js';

export async function registerReversalRoutes(app: FastifyInstance, dependencies: { reversalService: ReversalService; env: AppEnv }): Promise<void> {
  app.post<{ Params: { operationId: string } }>('/financial-operations/:operationId/reversal', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const input = parseBody(reversalRequestSchema, request.body);
    const result = await dependencies.reversalService.create({
      userId,
      operationId: request.params.operationId,
      ...(input.reason ? { reason: input.reason } : {}),
      idempotencyKey: parseIdempotencyKey(request)
    });
    return reply.status(201).send(result);
  });
}
