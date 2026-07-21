'use client';

import { type ReactNode, useEffect, useState } from 'react';
import type { WalletDto } from '@global-wallet/contracts';
import { PageHeader } from '../../components/ui/page-header';
import { StateView } from '../../components/ui/state-view';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { getWallet, type WalletApiResult } from '../../lib/api/wallet-api';
import { WalletActionsNav } from './wallet-actions-nav';
import { WalletBalanceCard } from './wallet-balance-card';
import { WalletRecentActivityPlaceholder } from './wallet-recent-activity-placeholder';
import { WalletReferenceTotalPlaceholder } from './wallet-reference-total-placeholder';

type WalletState = { status: 'loading' } | WalletApiResult;
type WalletDashboardProps = { renderLayout?: (children: ReactNode, authenticated: boolean) => ReactNode };

export function WalletDashboard({ renderLayout = (children) => children }: WalletDashboardProps) {
  const [state, setState] = useState<WalletState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getWallet().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return renderLayout(<StateView variant="loading" title="Carregando carteira" description="Verificando sua sessão e carregando os saldos da carteira." />, false);
  }

  if (state.status === 'unauthenticated') {
    return renderLayout(
      <StateView
        variant="unauthenticated"
        title="Entre para ver sua carteira"
        description="Crie uma conta ou entre para acessar seu painel de carteira somente leitura."
        actions={[{ href: '/login', label: 'Entrar' }, { href: '/register', label: 'Criar conta', variant: 'secondary' }]}
      />,
      false
    );
  }

  if (state.status === 'error') {
    return renderLayout(<StateView variant="error" title="Não foi possível carregar a carteira" description={state.message} actions={[{ href: '/', label: 'Tentar novamente', variant: 'secondary' }]} />, false);
  }

  return renderLayout(<WalletContent wallet={state.wallet} />, true);
}

function WalletContent({ wallet }: { wallet: WalletDto }) {
  const hasPositiveBalance = wallet.balances.some((balance) => balance.amountMinor > 0);

  return (
    <div className="wallet-dashboard">
      <PageHeader
        eyebrow="Painel"
        title="Sua carteira está pronta"
        description="Os saldos são separados por moeda e carregados pela API da carteira. Fluxos de movimentação estão planejados, mas ainda não estão ativos."
      />
      <Card className="wallet-summary">
        <Badge variant={hasPositiveBalance ? 'status' : 'planned'}>{hasPositiveBalance ? 'Carteira disponível' : 'Saldo zerado'}</Badge>
        <h2>Resumo da carteira</h2>
        <div className="wallet-summary__meta">
          <span>ID da carteira: {wallet.walletId}</span>
          <span>Criada em: {new Date(wallet.createdAt).toLocaleDateString('pt-BR')}</span>
          <span>Compatíveis: {wallet.supportedCurrencies.join(', ')}</span>
        </div>
      </Card>
      {!hasPositiveBalance ? (
        <StateView variant="empty" title="Ainda não há saldo" description="Este é um estado válido para uma carteira nova. Ações de depósito, câmbio e transferência aparecerão apenas depois que esses fluxos forem implementados." />
      ) : null}
      <section className="wallet-dashboard__planned" aria-label="Áreas planejadas da carteira">
        <WalletReferenceTotalPlaceholder />
        <WalletActionsNav />
      </section>
      <section className="wallet-dashboard__grid" aria-label="Saldos por moeda">
        {wallet.balances.map((balance) => <WalletBalanceCard key={balance.currency} balance={balance} />)}
      </section>
      <WalletRecentActivityPlaceholder />
    </div>
  );
}
