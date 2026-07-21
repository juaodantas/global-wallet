import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import type { AppEnv } from './shared/config/env.js';
import { loadEnv } from './shared/config/env.js';
import { prisma } from './shared/db/prisma.js';
import { registerErrorHandler } from './shared/http/error-handler.js';
import { AuthService } from './modules/auth/application/auth-service.js';
import type { AuthRepository } from './modules/auth/application/auth-repository.js';
import { PrismaAuthRepository } from './modules/auth/infrastructure/prisma-auth-repository.js';
import { registerAuthRoutes } from './modules/auth/http/auth-routes.js';
import type { CreateWalletForUserPort } from './modules/wallet/application/create-wallet-port.js';
import { CreateWalletForUserUseCase } from './modules/wallet/application/create-wallet-for-user.js';
import { GetWalletForUserQuery } from './modules/wallet/application/get-wallet-for-user.js';
import type { WalletReadRepository } from './modules/wallet/application/get-wallet-for-user.js';
import { registerWalletRoutes } from './modules/wallet/http/wallet-routes.js';
import { PrismaWalletRepository } from './modules/wallet/infrastructure/prisma-wallet-repository.js';

export type AppDependencies = {
  env?: AppEnv;
  authRepository?: AuthRepository;
  walletCreator?: CreateWalletForUserPort;
  walletRepository?: WalletReadRepository;
};

export async function buildApp(dependencies: AppDependencies = {}) {
  const env = dependencies.env ?? loadEnv();
  const app = fastify({ logger: env.NODE_ENV === 'production' });
  await app.register(fastifyCors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(fastifyCookie);
  registerErrorHandler(app);

  const authRepository = dependencies.authRepository ?? new PrismaAuthRepository(prisma);
  const walletRepository = new PrismaWalletRepository(prisma);
  const walletCreator = dependencies.walletCreator ?? new CreateWalletForUserUseCase(walletRepository);
  const walletReader = dependencies.walletRepository ?? walletRepository;
  const authService = new AuthService(authRepository, walletCreator);
  const walletQuery = new GetWalletForUserQuery(walletReader);

  app.get('/health', async () => ({ status: 'ok' }));
  await registerAuthRoutes(app, { authService, env });
  await registerWalletRoutes(app, { walletQuery, env });

  return app;
}
