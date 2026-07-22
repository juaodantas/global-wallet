'use server';

import { createExchangeConversionRequestSchema, createExchangeQuoteRequestSchema, exchangeConversionSchema, exchangeQuoteSchema } from '@global-wallet/contracts';
import type { ExchangeConversionDto, ExchangeQuoteDto } from '@global-wallet/contracts';
import { apiPost } from './action-utils';

export async function createQuoteAction(input: {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmountMinor: number;
}): Promise<ExchangeQuoteDto> {
  const validatedInput = createExchangeQuoteRequestSchema.parse(input);
  const rawData = await apiPost('/exchange/quotes', validatedInput);
  return exchangeQuoteSchema.parse(rawData);
}

export async function executeConversionAction(quoteId: string): Promise<ExchangeConversionDto> {
  const validatedInput = createExchangeConversionRequestSchema.parse({ quoteId });
  const rawData = await apiPost('/exchange/conversions', validatedInput);
  return exchangeConversionSchema.parse(rawData);
}
