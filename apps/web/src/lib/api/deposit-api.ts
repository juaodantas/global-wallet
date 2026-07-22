import { depositListSchema, depositSchema, type DepositDto } from '@global-wallet/contracts';
import { apiBaseUrl } from './api-base-url';
import { createIdempotencyKey, readApiError } from './api-error';

export async function createDeposit(amountMinor: number): Promise<DepositDto> {
  const response = await fetch(`${apiBaseUrl}/deposits`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify({ amountMinor }) });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível criar o depósito.'));
  return depositSchema.parse(await response.json());
}

export async function confirmDeposit(depositId: string): Promise<DepositDto> {
  const response = await fetch(`${apiBaseUrl}/deposits/${depositId}/confirm`, { method: 'POST', credentials: 'include', headers: { 'Idempotency-Key': createIdempotencyKey() } });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível confirmar o depósito.'));
  return depositSchema.parse(await response.json());
}

export async function listDeposits(): Promise<DepositDto[]> {
  const response = await fetch(`${apiBaseUrl}/deposits`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar os depósitos.'));
  return depositListSchema.parse(await response.json());
}
