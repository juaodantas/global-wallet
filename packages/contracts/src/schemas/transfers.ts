import { z } from 'zod';
import { currencySchema, uuidSchema, walletBalanceSchema } from './common.js';
import { positiveAmountMinorSchema } from './deposits.js';

export const financialOperationSchema = z.object({
  operationId: uuidSchema,
  type: z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']),
  createdAt: z.string(),
  originalOperationId: uuidSchema.optional(),
  reversalOperationId: uuidSchema.optional()
});

export const createTransferRequestSchema = z.object({
  recipientEmail: z.string().trim().email().transform((email) => email.toLowerCase()),
  currency: currencySchema,
  amountMinor: positiveAmountMinorSchema
});

export const transferSchema = z.object({
  transferId: uuidSchema,
  operation: financialOperationSchema,
  senderWalletId: uuidSchema,
  recipientWalletId: uuidSchema,
  recipientEmail: z.string().email(),
  currency: currencySchema,
  amountMinor: positiveAmountMinorSchema,
  balances: z.object({ source: walletBalanceSchema.optional(), recipient: walletBalanceSchema.optional() }).optional(),
  createdAt: z.string()
});

export const transferListSchema = z.array(transferSchema);
