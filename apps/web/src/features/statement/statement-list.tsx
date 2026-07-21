'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Currency, StatementItemDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { StateView } from '../../components/ui/state-view';
import { formatMoneyMinor } from '../../lib/format/money';
import { listStatement } from '../../lib/api/statement-api';

const currencies: Currency[] = ['BRL', 'USD', 'EUR', 'GBP'];

const operationTypes = ['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL'] as const;

const directionLabels: Record<string, string> = {
  CREDIT: 'Entrada',
  DEBIT: 'Saída',
  MIXED: 'Conversão'
};

const typeLabels: Record<string, string> = {
  DEPOSIT: 'Depósito',
  TRANSFER: 'Transferência',
  EXCHANGE_CONVERSION: 'Câmbio',
  REVERSAL: 'Estorno'
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

export function StatementList() {
  const [items, setItems] = useState<StatementItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currency, setCurrency] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchList = useCallback(async (cursor?: string) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(undefined);
    try {
      const params: { cursor?: string; currency?: Currency; type?: string; from?: string; to?: string } = {};
      if (cursor) params.cursor = cursor;
      if (currency) params.currency = currency as Currency;
      if (type) params.type = type;
      if (from) params.from = from;
      if (to) params.to = to;
      const result = await listStatement(params);
      if (cursor) {
        setItems((prev) => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currency, type, from, to]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  function handleFilterChange() {
    void fetchList();
  }

  return (
    <div className="wallet-dashboard">
      <PageHeader
        eyebrow="Financeiro"
        title="Extrato"
        description="Consulte todas as operações da sua conta."
      />

      <Card>
        <div className="statement-filters">
          <label className="field">
            <span>Moeda</span>
            <select value={currency} onChange={(e) => { setCurrency(e.target.value); }}>
              <option value="">Todas</option>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => { setType(e.target.value); }}>
              <option value="">Todos</option>
              {operationTypes.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>De</span>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); }} />
          </label>
          <label className="field">
            <span>Até</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); }} />
          </label>
          <Button onClick={handleFilterChange} loading={loading}>Filtrar</Button>
        </div>
      </Card>

      {loading ? (
        <StateView variant="loading" title="Carregando extrato" description="Aguarde enquanto carregamos suas operações." />
      ) : error ? (
        <StateView variant="error" title="Erro ao carregar extrato" description={error ?? 'Erro inesperado.'}>
          <Button onClick={() => { void fetchList(); }}>Tentar novamente</Button>
        </StateView>
      ) : items.length === 0 ? (
        <StateView variant="empty" title="Nenhuma operação encontrada" description="Nenhuma operação corresponde aos filtros selecionados." />
      ) : (
        <>
          <div className="statement-list">
            {items.map((item) => (
              <Link key={item.operationId} href={`/statement/${item.operationId}`} className="statement-list__link">
                <Card>
                  <div className="statement-list__item">
                    <div className="statement-list__item-header">
                      <Badge variant="status">{directionLabels[item.direction]}</Badge>
                      <Badge variant="currency">{item.currency}</Badge>
                      {item.type === 'REVERSAL' ? <Badge variant="planned">Estorno</Badge> : null}
                      {item.status === 'REVERSED' ? <Badge variant="planned">Reversão aplicada</Badge> : null}
                      <span className="statement-list__type">{typeLabels[item.type]}</span>
                    </div>
                    <div className="statement-list__item-body">
                      <span className="statement-list__amount">{formatMoneyMinor(item.currency, item.amountMinor)}</span>
                      {item.source && item.target ? (
                        <span className="statement-list__conversion">
                          {formatMoneyMinor(item.source.currency, item.source.amountMinor)}
                          {' → '}
                          {formatMoneyMinor(item.target.currency, item.target.amountMinor)}
                        </span>
                      ) : null}
                    </div>
                    <div className="statement-list__item-footer">
                      <span className="statement-list__date">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {nextCursor ? (
            <div className="statement-list__load-more">
              <Button onClick={() => { void fetchList(nextCursor); }} loading={loadingMore}>
                Carregar mais
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
