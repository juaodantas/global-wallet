'use server';

import { cookies } from 'next/headers';
import { loginRequestSchema, registerRequestSchema, authSessionSchema, errorResponseSchema } from '@global-wallet/contracts';
import type { AuthSessionDto } from '@global-wallet/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function extractGwSession(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/gw_session=([^;]+)/);
  return match?.[1] ?? null;
}

export async function loginAction(input: { email: string; password: string }): Promise<AuthSessionDto> {
  const validatedInput = loginRequestSchema.parse(input);

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validatedInput),
  });

  const payload = await response.json();

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    throw new Error(parsed.success ? parsed.data.error.message : 'Não foi possível autenticar.');
  }

  const cookieValue = extractGwSession(response.headers.get('set-cookie'));
  if (cookieValue) {
    const cookieStore = await cookies();
    cookieStore.set('gw_session', cookieValue, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  return authSessionSchema.parse(payload);
}

export async function registerAction(input: { name: string; email: string; password: string }): Promise<AuthSessionDto> {
  const validatedInput = registerRequestSchema.parse(input);

  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validatedInput),
  });

  const payload = await response.json();

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    throw new Error(parsed.success ? parsed.data.error.message : 'Não foi possível cadastrar.');
  }

  const cookieValue = extractGwSession(response.headers.get('set-cookie'));
  if (cookieValue) {
    const cookieStore = await cookies();
    cookieStore.set('gw_session', cookieValue, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  return authSessionSchema.parse(payload);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const gwSession = cookieStore.get('gw_session');

  const headers: Record<string, string> = {};
  if (gwSession) {
    headers['Cookie'] = `gw_session=${gwSession.value}`;
  }

  const response = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error('Não foi possível sair.');
  }

  cookieStore.delete('gw_session');
}
