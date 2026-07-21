import { describe, expect, it, afterAll, beforeEach } from 'vitest';
import { createTestApp, createSignedSessionJwtWithSubject } from './support/test-app.js';
import { prisma } from '../src/shared/db/prisma.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const testUserA = { id: '00000000-0000-4000-8000-000000000001', walletId: '00000000-0000-4000-8000-100000000001' };
const testUserB = { id: '00000000-0000-4000-8000-000000000002', walletId: '00000000-0000-4000-8000-100000000002' };

// ── Helpers ──────────────────────────────────────────

async function seedUser(data: { id: string; walletId: string; email?: string }) {
  const email = data.email ?? `${data.id}@example.com`;
  await prisma.user.upsert({
    where: { id: data.id },
    update: {},
    create: {
      id: data.id, name: 'Test', email, passwordHash: 'hash',
      wallet: {
        create: {
          id: data.walletId,
          balances: {
            createMany: { data: [
              { currency: 'BRL', amountMinor: 0 }, { currency: 'USD', amountMinor: 0 },
              { currency: 'EUR', amountMinor: 0 }, { currency: 'GBP', amountMinor: 0 }
            ]}
          }
        }
      }
    }
  });
}

async function seedDepositAndConfirm(userId: string, walletId: string, amountMinor: number, seq: number): Promise<string> {
  const opId = `00000000-0000-4000-8000-${(200000000000 + seq).toString().slice(0, 12)}`;
  const depId = `00000000-0000-4000-8000-${(400000000000 + seq).toString().slice(0, 12)}`;

  await prisma.financialOperation.create({ data: { id: opId, actorUserId: userId, primaryWalletId: walletId, type: 'DEPOSIT', status: 'COMPLETED' } });
  await prisma.deposit.create({ data: { id: depId, userId, walletId, currency: 'BRL', amountMinor, status: 'CONFIRMED', gatewayReference: `gw_${depId}`, confirmedAt: new Date(), operationId: opId } });
  await prisma.ledgerEntry.create({ data: { operationId: opId, walletId, currency: 'BRL', direction: 'CREDIT', amountMinor, balanceAfterMinor: amountMinor } });
  await prisma.walletBalance.update({ where: { walletId_currency: { walletId, currency: 'BRL' } }, data: { amountMinor: { increment: amountMinor } } });
  return opId;
}

async function seedTransfer(senderId: string, senderWid: string, recipientId: string, recipientWid: string, amountMinor: number, seq: number): Promise<string> {
  const opId = `00000000-0000-4000-8000-${(200000000000 + seq).toString().slice(0, 12)}`;
  const trfId = `00000000-0000-4000-8000-${(500000000000 + seq).toString().slice(0, 12)}`;

  await prisma.financialOperation.create({ data: { id: opId, actorUserId: senderId, primaryWalletId: senderWid, type: 'TRANSFER', status: 'COMPLETED' } });
  await prisma.ledgerEntry.create({ data: { operationId: opId, walletId: senderWid, currency: 'BRL', direction: 'DEBIT', amountMinor, balanceAfterMinor: -amountMinor } });
  await prisma.ledgerEntry.create({ data: { operationId: opId, walletId: recipientWid, currency: 'BRL', direction: 'CREDIT', amountMinor, balanceAfterMinor: amountMinor } });
  await prisma.transfer.create({ data: { id: trfId, operationId: opId, senderWalletId: senderWid, recipientWalletId: recipientWid, recipientEmail: `${recipientId}@example.com`, currency: 'BRL', amountMinor } });
  await prisma.walletBalance.update({ where: { walletId_currency: { walletId: senderWid, currency: 'BRL' } }, data: { amountMinor: { decrement: amountMinor } } });
  await prisma.walletBalance.update({ where: { walletId_currency: { walletId: recipientWid, currency: 'BRL' } }, data: { amountMinor: { increment: amountMinor } } });
  return opId;
}

async function cleanDatabase() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ledger_entries, transfers, deposits, exchange_conversions, exchange_quotes, exchange_rate_snapshots, financial_operations, idempotency_records, wallet_balances, wallets, users CASCADE');
}

beforeEach(async () => { await cleanDatabase(); });
afterAll(async () => { await cleanDatabase(); });

// ════════════════════════════════════════════════════════
// STATEMENT TESTS
// ════════════════════════════════════════════════════════

describe('statement', () => {
  it('returns empty for new user', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const res = await app.inject({ method: 'GET', url: '/statement', cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
  });

  it('includes confirmed deposits as CREDIT', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 50000, 1);
    const res = await app.inject({ method: 'GET', url: '/statement', cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].type).toBe('DEPOSIT');
    expect(res.json().items[0].direction).toBe('CREDIT');
    expect(res.json().items[0].amountMinor).toBe(50000);
  });

  it('includes sent transfers as DEBIT for sender', async () => {
    const { app } = await createTestApp();
    await seedUser({ ...testUserA, email: 'sender@example.com' });
    await seedUser({ ...testUserB, email: 'recv@example.com' });
    await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 100000, 2);
    await seedTransfer(testUserA.id, testUserA.walletId, testUserB.id, testUserB.walletId, 30000, 3);
    const res = await app.inject({ method: 'GET', url: '/statement', cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
    const debit = res.json().items.find((i: { direction: string }) => i.direction === 'DEBIT');
    expect(debit).toBeDefined();
    expect(debit.type).toBe('TRANSFER');
    expect(debit.amountMinor).toBe(30000);
  });

  it('includes received transfers as CREDIT for recipient', async () => {
    const { app } = await createTestApp();
    await seedUser({ ...testUserA, email: 's2@example.com' });
    await seedUser({ ...testUserB, email: 'r2@example.com' });
    await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 100000, 4);
    await seedTransfer(testUserA.id, testUserA.walletId, testUserB.id, testUserB.walletId, 25000, 5);
    const res = await app.inject({ method: 'GET', url: '/statement', cookies: { gw_session: createSignedSessionJwtWithSubject(testUserB.id) } });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].direction).toBe('CREDIT');
    expect(res.json().items[0].amountMinor).toBe(25000);
  });

  it('returns operation detail', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 75000, 6);
    const res = await app.inject({ method: 'GET', url: `/statement/${opId}`, cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(res.statusCode).toBe(200);
    expect(res.json().type).toBe('DEPOSIT');
    expect(res.json().entries).toHaveLength(1);
  });

  it('rejects unauthorized access', async () => {
    const { app } = await createTestApp();
    await seedUser({ ...testUserA, email: 'own@example.com' });
    await seedUser({ ...testUserB, email: 'intr@example.com' });
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 50000, 7);
    const res = await app.inject({ method: 'GET', url: `/statement/${opId}`, cookies: { gw_session: createSignedSessionJwtWithSubject(testUserB.id) } });
    expect(res.statusCode).toBe(404);
  });

  it('paginates with cursor', async () => {
    const { app } = await createTestApp();
    const userC = { id: '00000000-0000-4000-8000-000000000003', walletId: '00000000-0000-4000-8000-100000000003' };
    await seedUser({ ...userC, email: 'pag@example.com' });
    for (let i = 0; i < 21; i++) await seedDepositAndConfirm(userC.id, userC.walletId, 1000 * (i + 1), 100 + i);
    const p1 = await app.inject({ method: 'GET', url: '/statement', cookies: { gw_session: createSignedSessionJwtWithSubject(userC.id) } });
    expect(p1.statusCode).toBe(200);
    expect(p1.json().items).toHaveLength(20);
    expect(p1.json().nextCursor).toBeDefined();
    const p2 = await app.inject({ method: 'GET', url: `/statement?cursor=${p1.json().nextCursor}`, cookies: { gw_session: createSignedSessionJwtWithSubject(userC.id) } });
    expect(p2.statusCode).toBe(200);
    expect(p2.json().items).toHaveLength(1);
    expect(p2.json().nextCursor).toBeUndefined();
    const ids1 = new Set(p1.json().items.map((i: { operationId: string }) => i.operationId));
    expect(p2.json().items.some((i: { operationId: string }) => ids1.has(i.operationId))).toBe(false);
  });
});

// ════════════════════════════════════════════════════════
// REVERSAL TESTS
// ════════════════════════════════════════════════════════

describe('reversal', () => {
  it('reverses a confirmed deposit', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 50000, 50);
    const res = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r1' },
      payload: { reason: 'Test' },
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.reversalId).toMatch(uuidPattern);
    expect(body.originalOperation.operationId).toBe(opId);
    expect(body.reversalOperation.type).toBe('REVERSAL');
    // Original should now be REVERSED
    const st = await app.inject({ method: 'GET', url: `/statement/${opId}`, cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(st.json().status).toBe('REVERSED');
  });

  it('returns 404 for non-existent operation', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const res = await app.inject({
      method: 'POST', url: '/financial-operations/00000000-0000-4000-8000-999999999999/reversal',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r2' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for another user operation', async () => {
    const { app } = await createTestApp();
    await seedUser({ ...testUserA, email: 'a@example.com' });
    await seedUser({ ...testUserB, email: 'b@example.com' });
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 50000, 51);
    const res = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r3' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserB.id) }
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects duplicate reversal', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 10000, 52);
    const r1 = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r4a' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r1.statusCode).toBe(201);
    const r2 = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r4b-diff' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r2.statusCode).toBe(409);
    expect(r2.json().error.code).toBe('FINANCIAL_OPERATION_ALREADY_REVERSED');
  });

  it('is idempotent with same key', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 20000, 53);
    const r1 = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r5-same' },
      payload: { reason: 'Idempotent' },
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r1.statusCode).toBe(201);
    const r2 = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r5-same' },
      payload: { reason: 'Idempotent' },
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r2.statusCode).toBe(201);
    expect(r2.json()).toEqual(r1.json());
  });

  it('allows negative balance after reversal', async () => {
    const { app } = await createTestApp();
    await seedUser({ ...testUserA, email: 'neg@example.com' });
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 5000, 54);
    await seedUser({ ...testUserB, email: 'negrec@example.com' });
    await seedTransfer(testUserA.id, testUserA.walletId, testUserB.id, testUserB.walletId, 4000, 55);
    const rev = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r6-neg' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(rev.statusCode).toBe(201);
    const bal = await prisma.walletBalance.findUnique({ where: { walletId_currency: { walletId: testUserA.walletId, currency: 'BRL' } } });
    expect(Number(bal!.amountMinor)).toBe(-4000);
  });

  it('rejects reversal of REVERSAL type', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 5000, 56);
    const r1 = await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r7a' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r1.statusCode).toBe(201);
    const revOpId = r1.json().reversalOperation.operationId;
    const r2 = await app.inject({
      method: 'POST', url: `/financial-operations/${revOpId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r7b' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    expect(r2.statusCode).toBe(409);
    expect(r2.json().error.code).toBe('FINANCIAL_OPERATION_NOT_REVERSIBLE');
  });

  it('preserves original ledger entries', async () => {
    const { app } = await createTestApp();
    await seedUser(testUserA);
    const opId = await seedDepositAndConfirm(testUserA.id, testUserA.walletId, 30000, 57);
    const before = await app.inject({ method: 'GET', url: `/statement/${opId}`, cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    const entriesBefore = before.json().entries;
    await app.inject({
      method: 'POST', url: `/financial-operations/${opId}/reversal`,
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r8' },
      payload: {},
      cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) }
    });
    const after = await app.inject({ method: 'GET', url: `/statement/${opId}`, cookies: { gw_session: createSignedSessionJwtWithSubject(testUserA.id) } });
    expect(after.json().entries).toEqual(entriesBefore);
  });

  it('rejects unauthenticated request', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'POST', url: '/financial-operations/00000000-0000-4000-8000-200000000001/reversal',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'r9' },
      payload: {}
    });
    expect(res.statusCode).toBe(401);
  });
});
