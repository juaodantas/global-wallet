import { z } from 'zod';
import { currencySchema, uuidSchema } from './common.js';
import { positiveAmountMinorSchema } from './deposits.js';
import { financialOperationSchema } from './transfers.js';

export const exchangeQuoteStatusSchema = z.enum(['ACTIVE', 'USED', 'EXPIRED']);
export const exchangeRateStringSchema = z.string().regex(/^\d+\.\d{10}$/);

export const createExchangeQuoteRequestSchema = z.object({
  sourceCurrency: currencySchema,
  targetCurrency: currencySchema,
  sourceAmountMinor: positiveAmountMinorSchema
});

export const createExchangeConversionRequestSchema = z.object({
  quoteId: uuidSchema
});

export const exchangeQuoteSchema = z.object({
  quoteId: uuidSchema,
  sourceCurrency: currencySchema,
  targetCurrency: currencySchema,
  sourceAmountMinor: positiveAmountMinorSchema,
  targetAmountMinor: positiveAmountMinorSchema,
  rate: exchangeRateStringSchema,
  provider: z.string().min(1),
  status: exchangeQuoteStatusSchema,
  fetchedAt: z.string(),
  expiresAt: z.string(),
  createdAt: z.string()
});

export const exchangeConversionSchema = z.object({
  conversionId: uuidSchema,
  operation: financialOperationSchema,
  quoteId: uuidSchema,
  sourceCurrency: currencySchema,
  targetCurrency: currencySchema,
  sourceAmountMinor: positiveAmountMinorSchema,
  targetAmountMinor: positiveAmountMinorSchema,
  rate: exchangeRateStringSchema,
  provider: z.string().min(1),
  createdAt: z.string()
});
