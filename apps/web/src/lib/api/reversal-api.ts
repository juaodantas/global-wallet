import { reversalResponseSchema, type ReversalDto } from '@global-wallet/contracts';
import { apiBaseUrl } from './api-base-url';
import { createIdempotencyKey, readApiError } from './api-error';

export async function reversalOperation(operationId: string, reason?: string): Promise<ReversalDto> {
  const response = await fetch(`${apiBaseUrl}/financial-operations/${operationId}/reversal`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({ ...(reason ? { reason } : {}) })
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível estornar a operação.'));
  return reversalResponseSchema.parse(await response.json());
}
