import { authSessionSchema, type AuthSessionDto } from '@global-wallet/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function register(input: { name: string; email: string; password: string }): Promise<AuthSessionDto> {
  return postAuth('/auth/register', input);
}

export async function login(input: { email: string; password: string }): Promise<AuthSessionDto> {
  return postAuth('/auth/login', input);
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('Não foi possível sair.');
  } catch (error) {
    if (error instanceof Error && error.message === 'Não foi possível sair.') throw error;
    throw new Error('Não foi possível sair.');
  }
}

async function postAuth(path: string, body: object): Promise<AuthSessionDto> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = typeof payload === 'object' && payload !== null && 'error' in payload ? 'Não foi possível autenticar.' : 'A solicitação falhou.';
      throw new Error(message);
    }
    return authSessionSchema.parse(payload);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Não foi possível autenticar.' || error.message === 'A solicitação falhou.')) throw error;
    throw new Error('Não foi possível concluir a autenticação.');
  }
}
