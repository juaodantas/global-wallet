import type { FastifyInstance } from 'fastify';
import { createTransferRequestSchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { parseBody } from '../../../shared/http/parse-body.js';
import { parseIdempotencyKey } from '../../../shared/http/idempotency.js';
import { getSessionUserId } from '../../auth/http/session.js';
import type { TransferService } from '../application/transfer-service.js';

export async function registerTransferRoutes(app: FastifyInstance, dependencies: { transferService: TransferService; env: AppEnv }): Promise<void> {
  app.post('/transfers', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const input = parseBody(createTransferRequestSchema, request.body);
    const transfer = await dependencies.transferService.create({ ...input, userId, idempotencyKey: parseIdempotencyKey(request) });
    return reply.status(201).send(transfer);
  });

  app.get('/transfers', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const transfers = await dependencies.transferService.list(userId);
    return reply.status(200).send(transfers);
  });
}
