'use server';

import { createDepositRequestSchema, depositParamsSchema, depositSchema } from '@global-wallet/contracts';
import type { DepositDto } from '@global-wallet/contracts';
import { apiPost } from './action-utils';

export async function createDepositAction(amountMinor: number): Promise<DepositDto> {
  const validatedInput = createDepositRequestSchema.parse({ amountMinor });
  const rawData = await apiPost('/deposits', validatedInput);
  return depositSchema.parse(rawData);
}

export async function confirmDepositAction(depositId: string): Promise<DepositDto> {
  depositParamsSchema.parse({ depositId });
  const rawData = await apiPost(`/deposits/${depositId}/confirm`);
  return depositSchema.parse(rawData);
}
