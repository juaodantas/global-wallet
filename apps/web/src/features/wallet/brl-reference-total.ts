import type { BrlExchangeRatesDto, Currency, WalletBalanceDto } from '@global-wallet/contracts';

const convertibleCurrencies: Currency[] = ['USD', 'EUR', 'GBP'];

export function calculateBrlReferenceTotalMinor(balances: WalletBalanceDto[], rates: BrlExchangeRatesDto): number | null {
  const rateByCurrency = new Map(rates.rates.map((rate) => [rate.sourceCurrency, Number(rate.rate)]));
  let totalMinor = 0;

  for (const balance of balances) {
    if (balance.currency === 'BRL') {
      totalMinor += balance.amountMinor;
      continue;
    }

    if (!convertibleCurrencies.includes(balance.currency)) return null;

    const rate = rateByCurrency.get(balance.currency);
    if (rate === undefined || !Number.isFinite(rate)) return null;

    const sourceMajor = balance.amountMinor / 100;
    totalMinor += Math.round(sourceMajor * rate * 100);
  }

  return totalMinor;
}
