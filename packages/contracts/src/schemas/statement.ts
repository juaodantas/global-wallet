import { z } from 'zod';
import { currencySchema, uuidSchema } from './common.js';
import { positiveAmountMinorSchema } from './deposits.js';

export const statementQuerySchema = z.object({
  cursor: z.string().optional(),
  currency: currencySchema.optional(),
  type: z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL']).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export const moneyLegSchema = z.object({
  currency: currencySchema,
  amountMinor: positiveAmountMinorSchema
});

export const statementItemSchema = z.object({
  operationId: uuidSchema,
  type: z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL']),
  status: z.enum(['COMPLETED', 'REVERSED']),
  direction: z.enum(['CREDIT', 'DEBIT', 'MIXED']),
  currency: currencySchema,
  amountMinor: positiveAmountMinorSchema,
  source: moneyLegSchema.optional(),
  target: moneyLegSchema.optional(),
  originalOperationId: uuidSchema.optional(),
  reversalOperationId: uuidSchema.optional(),
  correlationId: uuidSchema.optional(),
  createdAt: z.string()
});

export const statementListSchema = z.object({
  items: z.array(statementItemSchema),
  nextCursor: z.string().optional()
});

export const statementDetailSchema = z.object({
  operationId: uuidSchema,
  type: z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL']),
  status: z.enum(['COMPLETED', 'REVERSED']),
  primaryWalletId: uuidSchema,
  currency: currencySchema,
  amountMinor: positiveAmountMinorSchema,
  direction: z.enum(['CREDIT', 'DEBIT', 'MIXED']),
  source: moneyLegSchema.optional(),
  target: moneyLegSchema.optional(),
  originalOperationId: uuidSchema.optional(),
  reversalOperationId: uuidSchema.optional(),
  correlationId: uuidSchema.optional(),
  entries: z.array(z.object({
    walletId: uuidSchema,
    currency: currencySchema,
    direction: z.enum(['DEBIT', 'CREDIT']),
    amountMinor: positiveAmountMinorSchema,
    balanceAfterMinor: z.number().int(),
    createdAt: z.string()
  })),
  createdAt: z.string()
});
