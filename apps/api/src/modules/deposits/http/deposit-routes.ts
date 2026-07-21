import type { FastifyInstance } from 'fastify';
import { createDepositRequestSchema, depositParamsSchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { parseBody } from '../../../shared/http/parse-body.js';
import { parseIdempotencyKey } from '../../../shared/http/idempotency.js';
import { getSessionUserId } from '../../auth/http/session.js';
import type { DepositService } from '../application/deposit-service.js';

export async function registerDepositRoutes(app: FastifyInstance, dependencies: { depositService: DepositService; env: AppEnv }): Promise<void> {
  app.post('/deposits', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const input = parseBody(createDepositRequestSchema, request.body);
    const deposit = await dependencies.depositService.create({ userId, amountMinor: input.amountMinor, idempotencyKey: parseIdempotencyKey(request) });
    return reply.status(201).send(deposit);
  });

  app.post('/deposits/:depositId/confirm', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const params = depositParamsSchema.parse(request.params);
    const deposit = await dependencies.depositService.confirm({ userId, depositId: params.depositId, idempotencyKey: parseIdempotencyKey(request) });
    return reply.status(200).send(deposit);
  });

  app.get('/deposits', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const deposits = await dependencies.depositService.list(userId);
    return reply.status(200).send(deposits);
  });
}
