import type { FastifyInstance } from 'fastify';
import type { AppEnv } from '../../../shared/config/env.js';
import type { GetWalletForUserQuery } from '../application/get-wallet-for-user.js';
import { getSessionUserId } from '../../auth/http/session.js';

export async function registerWalletRoutes(app: FastifyInstance, dependencies: { walletQuery: GetWalletForUserQuery; env: AppEnv }): Promise<void> {
  app.get('/wallet', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const wallet = await dependencies.walletQuery.execute(userId);
    return reply.status(200).send(wallet);
  });
}
