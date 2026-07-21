import { z } from 'zod';

export const registerRequestSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8)
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8)
});
