'use server';

import { reversalRequestSchema, reversalResponseSchema, uuidSchema } from '@global-wallet/contracts';
import type { ReversalDto } from '@global-wallet/contracts';
import { apiPost } from './action-utils';

export async function reverseOperationAction(operationId: string, reason?: string): Promise<ReversalDto> {
  uuidSchema.parse(operationId);
  const validatedBody = reversalRequestSchema.parse({ ...(reason ? { reason } : {}) });
  const rawData = await apiPost(`/financial-operations/${operationId}/reversal`, validatedBody);
  return reversalResponseSchema.parse(rawData);
}
