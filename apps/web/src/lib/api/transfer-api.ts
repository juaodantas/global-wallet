import { transferListSchema, transferSchema, type Currency, type TransferDto } from '@global-wallet/contracts';
import { apiBaseUrl } from './api-base-url';
import { createIdempotencyKey, readApiError } from './api-error';

export async function createTransfer(input: { recipientEmail: string; currency: Currency; amountMinor: number }): Promise<TransferDto> {
  const response = await fetch(`${apiBaseUrl}/transfers`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível enviar a transferência.'));
  return transferSchema.parse(await response.json());
}

export async function listTransfers(): Promise<TransferDto[]> {
  const response = await fetch(`${apiBaseUrl}/transfers`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar as transferências.'));
  return transferListSchema.parse(await response.json());
}
