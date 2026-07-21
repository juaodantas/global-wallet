CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE "ExchangeQuoteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

CREATE TABLE "deposits" (
  "id" UUID NOT NULL,
  "wallet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "operation_id" UUID,
  "currency" "Currency" NOT NULL DEFAULT 'BRL',
  "amount_minor" BIGINT NOT NULL,
  "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
  "gateway_reference" TEXT,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "deposits_amount_minor_positive" CHECK ("amount_minor" > 0),
  CONSTRAINT "deposits_currency_brl" CHECK ("currency" = 'BRL'),
  CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transfers" (
  "id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "sender_wallet_id" UUID NOT NULL,
  "recipient_wallet_id" UUID NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "currency" "Currency" NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transfers_amount_minor_positive" CHECK ("amount_minor" > 0),
  CONSTRAINT "transfers_distinct_wallets" CHECK ("sender_wallet_id" <> "recipient_wallet_id"),
  CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exchange_rate_snapshots" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "base_currency" "Currency" NOT NULL,
  "quote_currency" "Currency" NOT NULL,
  "rate" DECIMAL(20,10) NOT NULL,
  "fetched_at" TIMESTAMP(3) NOT NULL,
  "raw_payload_hash" TEXT,
  CONSTRAINT "exchange_rate_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exchange_quotes" (
  "id" UUID NOT NULL,
  "wallet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "source_currency" "Currency" NOT NULL,
  "target_currency" "Currency" NOT NULL,
  "source_amount_minor" BIGINT NOT NULL,
  "target_amount_minor" BIGINT NOT NULL,
  "rate" DECIMAL(20,10) NOT NULL,
  "rate_snapshot_id" UUID NOT NULL,
  "status" "ExchangeQuoteStatus" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_quotes_amounts_positive" CHECK ("source_amount_minor" > 0 AND "target_amount_minor" > 0),
  CONSTRAINT "exchange_quotes_distinct_currencies" CHECK ("source_currency" <> "target_currency"),
  CONSTRAINT "exchange_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exchange_conversions" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "wallet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "source_currency" "Currency" NOT NULL,
  "target_currency" "Currency" NOT NULL,
  "source_amount_minor" BIGINT NOT NULL,
  "target_amount_minor" BIGINT NOT NULL,
  "rate" DECIMAL(20,10) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_conversions_amounts_positive" CHECK ("source_amount_minor" > 0 AND "target_amount_minor" > 0),
  CONSTRAINT "exchange_conversions_distinct_currencies" CHECK ("source_currency" <> "target_currency"),
  CONSTRAINT "exchange_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deposits_operation_id_key" ON "deposits"("operation_id");
CREATE INDEX "deposits_user_id_created_at_idx" ON "deposits"("user_id", "created_at");
CREATE INDEX "deposits_operation_id_idx" ON "deposits"("operation_id");
CREATE UNIQUE INDEX "transfers_operation_id_key" ON "transfers"("operation_id");
CREATE INDEX "transfers_sender_wallet_id_created_at_idx" ON "transfers"("sender_wallet_id", "created_at");
CREATE INDEX "transfers_recipient_wallet_id_created_at_idx" ON "transfers"("recipient_wallet_id", "created_at");
CREATE INDEX "transfers_operation_id_idx" ON "transfers"("operation_id");
CREATE INDEX "exchange_rate_snapshots_base_currency_quote_currency_fetched_at_idx" ON "exchange_rate_snapshots"("base_currency", "quote_currency", "fetched_at");
CREATE INDEX "exchange_quotes_user_id_created_at_idx" ON "exchange_quotes"("user_id", "created_at");
CREATE INDEX "exchange_quotes_status_expires_at_idx" ON "exchange_quotes"("status", "expires_at");
CREATE UNIQUE INDEX "exchange_conversions_quote_id_key" ON "exchange_conversions"("quote_id");
CREATE UNIQUE INDEX "exchange_conversions_operation_id_key" ON "exchange_conversions"("operation_id");
CREATE INDEX "exchange_conversions_user_id_created_at_idx" ON "exchange_conversions"("user_id", "created_at");
CREATE INDEX "exchange_conversions_operation_id_idx" ON "exchange_conversions"("operation_id");
CREATE INDEX "exchange_conversions_quote_id_idx" ON "exchange_conversions"("quote_id");

ALTER TABLE "deposits" ADD CONSTRAINT "deposits_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sender_wallet_id_fkey" FOREIGN KEY ("sender_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recipient_wallet_id_fkey" FOREIGN KEY ("recipient_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_quotes" ADD CONSTRAINT "exchange_quotes_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_quotes" ADD CONSTRAINT "exchange_quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_quotes" ADD CONSTRAINT "exchange_quotes_rate_snapshot_id_fkey" FOREIGN KEY ("rate_snapshot_id") REFERENCES "exchange_rate_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_conversions" ADD CONSTRAINT "exchange_conversions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "exchange_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_conversions" ADD CONSTRAINT "exchange_conversions_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "financial_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_conversions" ADD CONSTRAINT "exchange_conversions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_conversions" ADD CONSTRAINT "exchange_conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
