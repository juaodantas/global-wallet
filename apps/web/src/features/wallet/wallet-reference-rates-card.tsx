import type { BrlExchangeRatesDto } from '@global-wallet/contracts';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import type { BrlExchangeRatesState } from './use-brl-exchange-rates';

export function WalletReferenceRatesCard({ ratesState }: { ratesState: BrlExchangeRatesState }) {
  return (
    <Card className="wallet-reference-rates-card" aria-labelledby="wallet-reference-rates-title">
      <div className="wallet-placeholder__header">
        <Badge variant="status">Informativo</Badge>
        <span>Referência de leitura</span>
      </div>
      <h2 id="wallet-reference-rates-title">Cotações atuais em BRL</h2>
      {ratesState.status === 'loading' ? <p className="wallet-reference-rates__meta">Carregando cotações de referência...</p> : null}
      {ratesState.status === 'error' ? <p className="wallet-reference-rates__meta">Cotações indisponíveis. Saldos reais continuam separados.</p> : null}
      {ratesState.status === 'success' ? <RatesContent data={ratesState.data} /> : null}
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
          <div key={rate.sourceCurrency} className="wallet-reference-rates__row">
            <span>1 {rate.sourceCurrency}</span>
            <strong>{formatBrl(rate.rate)}</strong>
          </div>
        ))}
      </div>
      <p className="wallet-reference-rates__meta">Fonte: {formatProvider(provider)} · Atualizado em {latestFetchedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
    </>
  );
}

function formatBrl(rate: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(rate));
}

function formatProvider(provider: string): string {
  return provider === 'frankfurter' ? 'Frankfurter' : provider;
}
