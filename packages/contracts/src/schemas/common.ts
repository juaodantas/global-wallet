import { z } from 'zod';

export const currencySchema = z.enum(['BRL', 'USD', 'EUR', 'GBP']);
export const supportedCurrencies = currencySchema.options;
export const uuidSchema = z.string().uuid();

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional()
  })
});

export const authUserSchema = z.object({
  userId: uuidSchema,
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string()
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  session: z.object({ authenticated: z.literal(true) })
});

export const walletBalanceSchema = z.object({
  currency: currencySchema,
  amountMinor: z.number().int().safe()
});

export const walletSchema = z.object({
  walletId: uuidSchema,
  userId: uuidSchema,
  supportedCurrencies: z.array(currencySchema),
  balances: z.array(walletBalanceSchema),
  createdAt: z.string()
});
