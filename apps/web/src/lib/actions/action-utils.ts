import { cookies } from 'next/headers';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function apiPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('gw_session');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Idempotency-Key': globalThis.crypto.randomUUID(),
  };

  if (sessionCookie) {
    headers['Cookie'] = `gw_session=${sessionCookie.value}`;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error: { message: string } }).error.message
        : 'Erro na operação.';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
