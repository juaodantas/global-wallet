import { z } from 'zod';
import { uuidSchema } from './common.js';
import { financialOperationSchema } from './transfers.js';

export const reversalRequestSchema = z.object({
  reason: z.string().max(500).optional()
});

export const reversalResponseSchema = z.object({
  reversalId: uuidSchema,
  originalOperation: financialOperationSchema,
  reversalOperation: financialOperationSchema,
  reason: z.string().optional(),
  createdAt: z.string()
});
