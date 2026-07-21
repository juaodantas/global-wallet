import type { PrismaClient } from '@prisma/client';
import { toUserId } from '../../../shared/domain/ids.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { AuthRepository, RegisterUserInput } from '../application/auth-repository.js';
import type { AuthUser, PublicAuthUser, UserId } from '../domain/types.js';

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type PrismaLike = Pick<PrismaClient, '$transaction' | 'user'>;

function isPrismaKnownError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === code;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaLike) {}

  async createUser(input: RegisterUserInput, transaction: unknown): Promise<PublicAuthUser> {
    const client = this.resolveClient(transaction);
    try {
      const user = await client.user.create({ data: { name: input.name, email: input.email, passwordHash: input.passwordHash } });
      return this.toPublicUser(user);
    } catch (error) {
      if (isPrismaKnownError(error, 'P2002')) {
        throw new AppError({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email already exists', statusCode: 409 });
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toAuthUser(user) : null;
  }

  async findById(userId: UserId): Promise<PublicAuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toPublicUser(user) : null;
  }

  async runInTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (transaction) => callback(transaction));
  }

  private resolveClient(transaction: unknown): Pick<PrismaClient, 'user'> {
    if (this.hasUserDelegate(transaction)) return transaction;
    return this.prisma;
  }

  private hasUserDelegate(value: unknown): value is Pick<PrismaClient, 'user'> {
    return typeof value === 'object' && value !== null && 'user' in value;
  }

  private toAuthUser(user: UserRecord): AuthUser {
    return { id: toUserId(user.id), name: user.name, email: user.email, passwordHash: user.passwordHash, createdAt: user.createdAt };
  }

  private toPublicUser(user: UserRecord): PublicAuthUser {
    return { id: toUserId(user.id), name: user.name, email: user.email, createdAt: user.createdAt };
  }
}
