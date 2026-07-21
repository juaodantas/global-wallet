import { describe, expect, it } from 'vitest';
import { createSignedSessionJwtWithSubject, createTestApp, testEnv } from './support/test-app.js';

describe('auth routes', () => {
  it('allows credentialed CORS for the configured web origin', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/auth/login',
      headers: {
        origin: testEnv.WEB_ORIGIN,
        'access-control-request-method': 'POST'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(testEnv.WEB_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('registers a user, creates a wallet, sets cookie, and returns no token fields', async () => {
    const { app, walletCreator } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ADA@example.com', password: 'secret123' } });

    expect(response.statusCode).toBe(201);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Lax');
    expect(walletCreator.createdFor).toHaveLength(1);
    const body = response.json();
    expect(body.user.email).toBe('ada@example.com');
    expect(JSON.stringify(body)).not.toMatch(/token|accessToken|jwt|refreshToken/i);
  });

  it('rejects a short registration password', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'short' } });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration', async () => {
    const { app } = await createTestApp();
    const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret123' };
    await app.inject({ method: 'POST', url: '/auth/register', payload });
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects invalid login credentials', async () => {
    const { app } = await createTestApp();
    await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'wrongpass' } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in successfully and sets cookie without token fields', async () => {
    const { app } = await createTestApp();
    await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'secret123' } });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(JSON.stringify(response.json())).not.toMatch(/token|accessToken|jwt|refreshToken/i);
  });

  it('clears cookie on logout', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/logout' });

    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(response.headers['set-cookie']).toContain('Max-Age=0');
  });

  it('rejects a private request after logout clears the cookie', async () => {
    const { app } = await createTestApp();
    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const sessionCookie = registerResponse.cookies[0];
    const logoutResponse = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { gw_session: sessionCookie?.value ?? '' } });
    const clearedCookie = logoutResponse.cookies[0];

    const wallet = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: clearedCookie?.value ?? '' } });

    expect(wallet.statusCode).toBe(401);
    expect(wallet.json().error.code).toBe('UNAUTHORIZED');
  });

  it('requires cookie for auth me and succeeds with a valid cookie', async () => {
    const { app } = await createTestApp();
    const unauthorized = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.code).toBe('UNAUTHORIZED');

    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const cookie = registerResponse.cookies[0];
    expect(cookie?.name).toBe('gw_session');
    const me = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: cookie?.value ?? '' } });

    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('ada@example.com');
  });

  it('rejects a tampered auth cookie', async () => {
    const { app } = await createTestApp();
    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const cookie = registerResponse.cookies[0];

    const response = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: `${cookie?.value ?? ''}tampered` } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a validly signed auth cookie with a non-UUID subject', async () => {
    const { app } = await createTestApp();
    const token = createSignedSessionJwtWithSubject('not-a-uuid');

    const response = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: token } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

});
