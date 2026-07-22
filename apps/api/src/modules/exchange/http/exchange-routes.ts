import type { FastifyInstance } from 'fastify';
import { brlExchangeRatesSchema, createExchangeConversionRequestSchema, createExchangeQuoteRequestSchema } from '@global-wallet/contracts';
import type { AppEnv } from '../../../shared/config/env.js';
import { parseBody } from '../../../shared/http/parse-body.js';
import { parseIdempotencyKey } from '../../../shared/http/idempotency.js';
import { getSessionUserId } from '../../auth/http/session.js';
import type { ExchangeService } from '../application/exchange-service.js';
import type { ReferenceRatesService } from '../application/reference-rates-service.js';

export async function registerExchangeRoutes(app: FastifyInstance, dependencies: { exchangeService: ExchangeService; referenceRatesService: ReferenceRatesService; env: AppEnv }): Promise<void> {
  app.get('/exchange/rates/brl', async (request, reply) => {
    getSessionUserId(request, dependencies.env);
    const rates = await dependencies.referenceRatesService.getBrlRates();
    return reply.status(200).send(brlExchangeRatesSchema.parse(rates));
  });

  app.post('/exchange/quotes', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const input = parseBody(createExchangeQuoteRequestSchema, request.body);
    const quote = await dependencies.exchangeService.createQuote({ ...input, userId });
    return reply.status(201).send(quote);
  });

  app.post('/exchange/conversions', async (request, reply) => {
    const userId = getSessionUserId(request, dependencies.env);
    const input = parseBody(createExchangeConversionRequestSchema, request.body);
    const conversion = await dependencies.exchangeService.executeConversion({ userId, quoteId: input.quoteId, idempotencyKey: parseIdempotencyKey(request) });
    return reply.status(201).send(conversion);
  });
}
