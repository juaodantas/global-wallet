import { walletSchema, type WalletDto } from '@global-wallet/contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export type WalletApiResult =
  | { status: 'success'; wallet: WalletDto }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

export async function getWallet(): Promise<WalletApiResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/wallet`, { credentials: 'include' });

    if (response.status === 401 || response.status === 403) {
      return { status: 'unauthenticated' };
    }

    if (!response.ok) {
      return { status: 'error', message: 'O serviço da carteira não está disponível no momento.' };
    }

    const payload = await response.json();
    return { status: 'success', wallet: walletSchema.parse(payload) };
  } catch {
    return { status: 'error', message: 'Não foi possível carregar os dados da carteira.' };
  }
}
