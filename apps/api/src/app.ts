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
import { LedgerPostingService } from './modules/ledger/application/ledger-posting-service.js';
import { PrismaLedgerRepository } from './modules/ledger/infrastructure/prisma-ledger-repository.js';
import { DepositService } from './modules/deposits/application/deposit-service.js';
import { PrismaDepositRepository } from './modules/deposits/infrastructure/prisma-deposit-repository.js';
import { registerDepositRoutes } from './modules/deposits/http/deposit-routes.js';
import { TransferService } from './modules/transfers/application/transfer-service.js';
import { PrismaTransferRepository } from './modules/transfers/infrastructure/prisma-transfer-repository.js';
import { registerTransferRoutes } from './modules/transfers/http/transfer-routes.js';
import { ExchangeService } from './modules/exchange/application/exchange-service.js';
import type { ExchangeRateProvider } from './modules/exchange/application/exchange-rate-provider.js';
import { ReferenceRatesService } from './modules/exchange/application/reference-rates-service.js';
import { PrismaExchangeRepository } from './modules/exchange/infrastructure/prisma-exchange-repository.js';
import { FrankfurterExchangeRateProvider } from './modules/exchange/infrastructure/frankfurter-rate-provider.js';
import { registerExchangeRoutes } from './modules/exchange/http/exchange-routes.js';
import { StatementService } from './modules/statement/application/statement-service.js';
import { registerStatementRoutes } from './modules/statement/http/statement-routes.js';
import { ReversalService } from './modules/reversals/application/reversal-service.js';
import { registerReversalRoutes } from './modules/reversals/http/reversal-routes.js';

export type AppDependencies = {
  env?: AppEnv;
  authRepository?: AuthRepository;
  walletCreator?: CreateWalletForUserPort;
  walletRepository?: WalletReadRepository;
  exchangeRateProvider?: ExchangeRateProvider;
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
  const ledgerPosting = new LedgerPostingService(new PrismaLedgerRepository(prisma));
  const depositService = new DepositService(new PrismaDepositRepository(prisma), ledgerPosting);
  const transferService = new TransferService(new PrismaTransferRepository(prisma), ledgerPosting);
  const exchangeRateProvider = dependencies.exchangeRateProvider ?? new FrankfurterExchangeRateProvider({
    baseUrl: env.FRANKFURTER_BASE_URL,
    timeoutMs: env.FRANKFURTER_TIMEOUT_MS,
    cacheTtlMs: env.FRANKFURTER_CACHE_TTL_MS,
    rateLimitWindowMs: env.FRANKFURTER_RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: env.FRANKFURTER_RATE_LIMIT_MAX_REQUESTS
  });
  const exchangeService = new ExchangeService(new PrismaExchangeRepository(prisma), ledgerPosting, exchangeRateProvider);
  const referenceRatesService = new ReferenceRatesService(exchangeRateProvider);
  const statementService = new StatementService(prisma);
  const reversalService = new ReversalService(prisma, ledgerPosting);

  app.get('/health', async () => ({ status: 'ok' }));
  await registerAuthRoutes(app, { authService, env });
  await registerWalletRoutes(app, { walletQuery, env });
  await registerDepositRoutes(app, { depositService, env });
  await registerTransferRoutes(app, { transferService, env });
  await registerExchangeRoutes(app, { exchangeService, referenceRatesService, env });
  await registerStatementRoutes(app, { statementService, env });
  await registerReversalRoutes(app, { reversalService, env });

  return app;
}
