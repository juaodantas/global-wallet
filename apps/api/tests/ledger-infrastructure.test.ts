import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(resolve(currentDirectory, '../prisma/migrations/20260721000000_initial/migration.sql'), 'utf8');
const repositorySource = readFileSync(resolve(currentDirectory, '../src/modules/ledger/infrastructure/prisma-ledger-repository.ts'), 'utf8');
const prismaSchema = readFileSync(resolve(currentDirectory, '../prisma/schema.prisma'), 'utf8');

describe('ledger infrastructure safeguards', () => {
  it('enforces positive ledger entry amounts and append-only entries in the initial migration', () => {
    expect(migrationSql).toContain('CONSTRAINT "ledger_entries_amount_minor_positive" CHECK ("amount_minor" > 0)');
    expect(migrationSql).toContain('CREATE FUNCTION prevent_ledger_entries_update_delete()');
    expect(migrationSql).toContain('CREATE TRIGGER ledger_entries_append_only');
    expect(migrationSql).toContain('BEFORE UPDATE OR DELETE ON "ledger_entries"');
    expect(migrationSql).toContain("RAISE EXCEPTION 'ledger_entries is append-only'");
  });

  it('keeps unused idempotency lock/status fields out of the Prisma schema and migration', () => {
    expect(prismaSchema).not.toContain('lockedUntil');
    expect(prismaSchema).not.toContain('status             String');
    expect(migrationSql).not.toContain('"locked_until"');
    expect(migrationSql).not.toContain('"status" TEXT NOT NULL DEFAULT');
    expect(migrationSql).not.toContain('idempotency_records_locked_until_idx');
  });

  it('serializes idempotency scope with a PostgreSQL advisory transaction lock before lookup', () => {
    const lockIndex = repositorySource.indexOf('await this.acquireIdempotencyScopeLock(transaction, request);');
    const lookupIndex = repositorySource.indexOf('transaction.idempotencyRecord.findFirst');

    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(lookupIndex).toBeGreaterThan(lockIndex);
    expect(repositorySource).toContain('pg_advisory_xact_lock');
    expect(repositorySource).toContain("createHash('sha256')");
  });

  it('stores idempotency records only with the operation response and without P2002 normal flow', () => {
    const createIndex = repositorySource.indexOf('transaction.idempotencyRecord.create');
    const responseIndex = repositorySource.indexOf('storedResponse: this.toStoredResponse(result)');

    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(responseIndex).toBeGreaterThan(createIndex);
    expect(repositorySource).not.toContain('P2002');
  });
});
