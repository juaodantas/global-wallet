import { z } from 'zod';
import { uuidSchema } from './common.js';

export const positiveAmountMinorSchema = z.number().int().positive().refine(Number.isSafeInteger);
export const depositStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'FAILED']);

export const createDepositRequestSchema = z.object({
  amountMinor: positiveAmountMinorSchema
});

export const depositParamsSchema = z.object({
  depositId: uuidSchema
});

export const depositSchema = z.object({
  depositId: uuidSchema,
  operationId: uuidSchema.optional(),
  currency: z.literal('BRL'),
  amountMinor: positiveAmountMinorSchema,
  status: depositStatusSchema,
  gatewayReference: z.string().optional(),
  confirmedAt: z.string().optional(),
  createdAt: z.string()
});

export const depositListSchema = z.array(depositSchema);
