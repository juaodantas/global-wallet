'use client';

import { useEffect, useState } from 'react';
import type { BrlExchangeRatesDto } from '@global-wallet/contracts';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { getBrlExchangeRates } from '../../lib/api/exchange-api';

type RatesState = { status: 'loading' } | { status: 'success'; data: BrlExchangeRatesDto } | { status: 'error' };

export function WalletReferenceRatesCard() {
  const [state, setState] = useState<RatesState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getBrlExchangeRates()
      .then((data) => {
        if (active) setState({ status: 'success', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="wallet-reference-total" aria-labelledby="wallet-reference-rates-title">
      <div className="wallet-placeholder__header">
        <Badge variant="status">Informativo</Badge>
        <span>Saldos separados por moeda</span>
      </div>
      <h2 id="wallet-reference-rates-title">Cotações atuais em BRL</h2>
      {state.status === 'loading' ? <p>Carregando cotações de referência...</p> : null}
      {state.status === 'error' ? <p>Cotações indisponíveis no momento. Seus saldos reais continuam separados por moeda.</p> : null}
      {state.status === 'success' ? <RatesContent data={state.data} /> : null}
    </Card>
  );
}

function RatesContent({ data }: { data: BrlExchangeRatesDto }) {
  const latestFetchedAt = data.rates.reduce((latest, rate) => (new Date(rate.fetchedAt).getTime() > latest.getTime() ? new Date(rate.fetchedAt) : latest), new Date(data.rates[0]?.fetchedAt ?? Date.now()));
  const provider = data.rates[0]?.provider ?? 'Frankfurter';

  return (
    <>
      <div className="wallet-reference-rates" aria-label="Cotações atuais contra BRL">
        {data.rates.map((rate) => (
          <p key={rate.sourceCurrency}>
            1 {rate.sourceCurrency} = {formatBrl(rate.rate)}
          </p>
        ))}
      </div>
      <p>Fonte: {formatProvider(provider)} · Atualizado em {latestFetchedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
    </>
  );
}

function formatBrl(rate: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(rate));
}

function formatProvider(provider: string): string {
  return provider === 'frankfurter' ? 'Frankfurter' : provider;
}
