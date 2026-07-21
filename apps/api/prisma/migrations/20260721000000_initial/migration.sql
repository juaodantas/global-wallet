-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "FinancialOperationType" AS ENUM ('DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "FinancialOperationStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_balances" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount_minor" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "stored_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_operations" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "primary_wallet_id" UUID NOT NULL,
    "idempotency_record_id" UUID,
    "original_operation_id" UUID,
    "reversal_operation_id" UUID,
    "correlation_id" UUID,
    "type" "FinancialOperationType" NOT NULL,
    "status" "FinancialOperationStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "direction" "LedgerEntryDirection" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "balance_after_minor" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_amount_minor_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- EnforceAppendOnly
CREATE FUNCTION prevent_ledger_entries_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$;

CREATE TRIGGER ledger_entries_append_only
BEFORE UPDATE OR DELETE ON "ledger_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entries_update_delete();

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_balances_wallet_id_currency_key" ON "wallet_balances"("wallet_id", "currency");

-- CreateIndex
CREATE INDEX "wallet_balances_wallet_id_currency_idx" ON "wallet_balances"("wallet_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_endpoint_key_key" ON "idempotency_records"("user_id", "endpoint", "idempotency_key");

-- CreateIndex
CREATE INDEX "idempotency_records_user_id_endpoint_idx" ON "idempotency_records"("user_id", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "financial_operations_idempotency_record_id_key" ON "financial_operations"("idempotency_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_operations_original_operation_id_key" ON "financial_operations"("original_operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_operations_reversal_operation_id_key" ON "financial_operations"("reversal_operation_id");

-- CreateIndex
CREATE INDEX "financial_operations_actor_user_id_created_at_idx" ON "financial_operations"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "financial_operations_primary_wallet_id_created_at_idx" ON "financial_operations"("primary_wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "financial_operations_type_status_idx" ON "financial_operations"("type", "status");

-- CreateIndex
CREATE INDEX "financial_operations_correlation_id_idx" ON "financial_operations"("correlation_id");

-- CreateIndex
CREATE INDEX "ledger_entries_operation_id_idx" ON "ledger_entries"("operation_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_currency_created_at_idx" ON "ledger_entries"("wallet_id", "currency", "created_at");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_balances" ADD CONSTRAINT "wallet_balances_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_primary_wallet_id_fkey" FOREIGN KEY ("primary_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_idempotency_record_id_fkey" FOREIGN KEY ("idempotency_record_id") REFERENCES "idempotency_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_original_operation_id_fkey" FOREIGN KEY ("original_operation_id") REFERENCES "financial_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_operations" ADD CONSTRAINT "financial_operations_reversal_operation_id_fkey" FOREIGN KEY ("reversal_operation_id") REFERENCES "financial_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
