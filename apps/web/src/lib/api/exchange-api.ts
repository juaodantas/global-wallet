import { brlExchangeRatesSchema, exchangeConversionSchema, exchangeQuoteSchema, type BrlExchangeRatesDto, type Currency, type ExchangeConversionDto, type ExchangeQuoteDto } from '@global-wallet/contracts';
import { createIdempotencyKey, readApiError } from './api-error';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function createExchangeQuote(input: { sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: number }): Promise<ExchangeQuoteDto> {
  const response = await fetch(`${apiBaseUrl}/exchange/quotes`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível criar a cotação.'));
  return exchangeQuoteSchema.parse(await response.json());
}

export async function executeExchangeConversion(quoteId: string): Promise<ExchangeConversionDto> {
  const response = await fetch(`${apiBaseUrl}/exchange/conversions`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify({ quoteId }) });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível executar o câmbio.'));
  return exchangeConversionSchema.parse(await response.json());
}

export async function getBrlExchangeRates(): Promise<BrlExchangeRatesDto> {
  const response = await fetch(`${apiBaseUrl}/exchange/rates/brl`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar as cotações.'));
  return brlExchangeRatesSchema.parse(await response.json());
}
