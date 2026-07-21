import type { UserId } from '../../../shared/domain/ids.js';

export type { UserId } from '../../../shared/domain/ids.js';

export type AuthUser = {
  id: UserId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>;
