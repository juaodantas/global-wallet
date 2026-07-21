import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
