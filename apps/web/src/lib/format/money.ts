import type { Currency } from '@global-wallet/contracts';

const fractionDigitsByCurrency: Record<Currency, number> = {
  BRL: 2,
  USD: 2,
  EUR: 2,
  GBP: 2
};

export function formatMoneyMinor(currency: Currency, amountMinor: number): string {
  const fractionDigits = fractionDigitsByCurrency[currency];
  const amount = amountMinor / 10 ** fractionDigits;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount);
}
