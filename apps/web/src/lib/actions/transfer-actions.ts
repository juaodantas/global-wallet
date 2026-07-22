'use server';

import { createTransferRequestSchema, transferSchema } from '@global-wallet/contracts';
import type { TransferDto } from '@global-wallet/contracts';
import { apiPost } from './action-utils';

export async function createTransferAction(input: {
  recipientEmail: string;
  currency: string;
  amountMinor: number;
}): Promise<TransferDto> {
  const validatedInput = createTransferRequestSchema.parse(input);
  const rawData = await apiPost('/transfers', validatedInput);
  return transferSchema.parse(rawData);
}
