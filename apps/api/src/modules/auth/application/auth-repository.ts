import type { PublicAuthUser, AuthUser, UserId } from '../domain/types.js';

export type RegisterUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export interface AuthRepository {
  createUser(input: RegisterUserInput, transaction: unknown): Promise<PublicAuthUser>;
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(userId: UserId): Promise<PublicAuthUser | null>;
  runInTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T>;
}
