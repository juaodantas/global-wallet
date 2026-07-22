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

export const brlReferenceSourceCurrencySchema = z.enum(['USD', 'EUR', 'GBP']);

export const brlExchangeRateSchema = z.object({
  sourceCurrency: brlReferenceSourceCurrencySchema,
  targetCurrency: z.literal('BRL'),
  unitAmount: z.literal(1),
  rate: exchangeRateStringSchema,
  provider: z.literal('frankfurter'),
  fetchedAt: z.string()
});

const requiredBrlReferenceSourceCurrencies = brlReferenceSourceCurrencySchema.options;

export const brlExchangeRatesSchema = z.object({
  baseCurrency: z.literal('BRL'),
  rates: z.array(brlExchangeRateSchema).length(3).superRefine((rates, context) => {
    for (const sourceCurrency of requiredBrlReferenceSourceCurrencies) {
      const occurrences = rates.filter((rate) => rate.sourceCurrency === sourceCurrency).length;
      if (occurrences !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected exactly one ${sourceCurrency}/BRL rate`,
          path: ['rates']
        });
      }
    }
  })
});
