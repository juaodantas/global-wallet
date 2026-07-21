import { statementListSchema, statementDetailSchema, type StatementListDto, type StatementDetailDto, type Currency } from '@global-wallet/contracts';
import { readApiError } from './api-error';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function listStatement(params?: { cursor?: string; currency?: Currency; type?: string; from?: string; to?: string }): Promise<StatementListDto> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.currency) searchParams.set('currency', params.currency);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  const query = searchParams.toString();
  const response = await fetch(`${apiBaseUrl}/statement${query ? `?${query}` : ''}`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar o extrato.'));
  return statementListSchema.parse(await response.json());
}

export async function getStatementOperation(operationId: string): Promise<StatementDetailDto> {
  const response = await fetch(`${apiBaseUrl}/statement/${operationId}`, { credentials: 'include' });
  if (!response.ok) throw new Error(await readApiError(response, 'Não foi possível carregar o detalhe da operação.'));
  return statementDetailSchema.parse(await response.json());
}
