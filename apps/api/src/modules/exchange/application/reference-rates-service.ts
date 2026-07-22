import { brlExchangeRatesSchema, type BrlExchangeRatesDto, type Currency } from '@global-wallet/contracts';
import type { ExchangeRateProvider } from './exchange-rate-provider.js';

const referenceSourceCurrencies = ['USD', 'EUR', 'GBP'] as const satisfies readonly Currency[];

export class ReferenceRatesService {
  constructor(private readonly rateProvider: ExchangeRateProvider) {}

  async getBrlRates(): Promise<BrlExchangeRatesDto> {
    const rates = await Promise.all(
      referenceSourceCurrencies.map(async (sourceCurrency) => {
        const rate = await this.rateProvider.getRate(sourceCurrency, 'BRL');
        return {
          sourceCurrency,
          targetCurrency: 'BRL' as const,
          unitAmount: 1 as const,
          rate: rate.rate,
          provider: rate.provider,
          fetchedAt: rate.fetchedAt.toISOString()
        };
      })
    );

    return brlExchangeRatesSchema.parse({ baseCurrency: 'BRL', rates });
  }
}
