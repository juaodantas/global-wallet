import type { z } from 'zod';
import type { authSessionSchema, authUserSchema, currencySchema, errorResponseSchema, walletBalanceSchema, walletSchema } from '../schemas/common.js';
import type { loginRequestSchema, registerRequestSchema } from '../schemas/auth.js';

export type Currency = z.infer<typeof currencySchema>;
export type ErrorResponseDto = z.infer<typeof errorResponseSchema>;
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionDto = z.infer<typeof authSessionSchema>;
export type RegisterRequestDto = z.input<typeof registerRequestSchema>;
export type LoginRequestDto = z.input<typeof loginRequestSchema>;
export type WalletBalanceDto = z.infer<typeof walletBalanceSchema>;
export type WalletDto = z.infer<typeof walletSchema>;
