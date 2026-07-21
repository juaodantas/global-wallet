'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StatementDetailDto, ReversalDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageHeader } from '../../components/ui/page-header';
import { StateView } from '../../components/ui/state-view';
import { formatMoneyMinor } from '../../lib/format/money';
import { getStatementOperation } from '../../lib/api/statement-api';
import { ReversalDialog } from '../reversals/reversal-dialog';

const typeLabels: Record<string, string> = {
  DEPOSIT: 'Depósito',
  TRANSFER: 'Transferência',
  EXCHANGE_CONVERSION: 'Câmbio',
  REVERSAL: 'Estorno'
};

const directionLabels: Record<string, string> = {
  CREDIT: 'Entrada',
  DEBIT: 'Saída',
  MIXED: 'Conversão'
};

type StatementDetailProps = {
  operationId: string;
};

export function StatementDetail({ operationId }: StatementDetailProps) {
  const [detail, setDetail] = useState<StatementDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [reversalResult, setReversalResult] = useState<ReversalDto | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    getStatementOperation(operationId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro inesperado.'))
      .finally(() => setLoading(false));
  }, [operationId]);

  if (loading) {
    return (
      <div className="wallet-dashboard">
        <StateView variant="loading" title="Carregando detalhes" description="Aguarde enquanto carregamos os detalhes da operação." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-dashboard">
        <StateView variant="error" title="Erro ao carregar detalhes" description={error ?? 'Erro inesperado.'} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="wallet-dashboard">
        <StateView variant="empty" title="Operação não encontrada" description="A operação solicitada não foi encontrada." />
      </div>
    );
  }

  const isReversible = detail.type !== 'REVERSAL' && !detail.reversalOperationId && !reversalResult;

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso));
  }

  return (
    <div className="wallet-dashboard">
      <PageHeader
        eyebrow="Extrato"
        title={typeLabels[detail.type] ?? ''}
        description={`Operação ${detail.operationId}`}
      />

      <Card>
        <div className="statement-detail__info">
          <div className="statement-detail__row">
            <span className="statement-detail__label">Tipo</span>
            <span>{typeLabels[detail.type] ?? detail.type}</span>
          </div>
          <div className="statement-detail__row">
            <span className="statement-detail__label">Status</span>
            <Badge variant="status">{detail.status === 'COMPLETED' ? 'Concluída' : 'Estornada'}</Badge>
          </div>
          <div className="statement-detail__row">
            <span className="statement-detail__label">Direção</span>
            <Badge variant="status">{directionLabels[detail.direction] ?? detail.direction}</Badge>
          </div>
          <div className="statement-detail__row">
            <span className="statement-detail__label">Moeda</span>
            <Badge variant="currency">{detail.currency}</Badge>
          </div>
          <div className="statement-detail__row">
            <span className="statement-detail__label">Valor</span>
            <span>{formatMoneyMinor(detail.currency, detail.amountMinor)}</span>
          </div>
          {detail.source && detail.target ? (
            <div className="statement-detail__row">
              <span className="statement-detail__label">Conversão</span>
              <span>
                {formatMoneyMinor(detail.source.currency, detail.source.amountMinor)}
                {' → '}
                {formatMoneyMinor(detail.target.currency, detail.target.amountMinor)}
              </span>
            </div>
          ) : null}
          <div className="statement-detail__row">
            <span className="statement-detail__label">Data</span>
            <span>{formatDate(detail.createdAt)}</span>
          </div>
          {detail.originalOperationId ? (
            <div className="statement-detail__row">
              <span className="statement-detail__label">Operação original</span>
              <Link href={`/statement/${detail.originalOperationId}`} className="statement-detail__link">
                {detail.originalOperationId}
              </Link>
            </div>
          ) : null}
          {detail.reversalOperationId ? (
            <div className="statement-detail__row">
              <span className="statement-detail__label">Estorno</span>
              <Link href={`/statement/${detail.reversalOperationId}`} className="statement-detail__link">
                {detail.reversalOperationId}
              </Link>
            </div>
          ) : null}
          {isReversible ? (
            <div className="statement-detail__row">
              <span className="statement-detail__label">Ações</span>
              <ReversalDialog
                operationId={detail.operationId}
                operationType={detail.type}
                onSuccess={(result) => {
                  setReversalResult(result);
                  // Refresh detail to show updated status
                  getStatementOperation(operationId).then(setDetail).catch(() => {});
                }}
              />
            </div>
          ) : null}
          {reversalResult ? (
            <div className="statement-detail__row">
              <span className="statement-detail__label">Resultado</span>
              <Badge variant="status">Estorno concluído</Badge>
              <Link href={`/statement/${reversalResult.reversalOperation.operationId}`} className="statement-detail__link" style={{ marginLeft: '0.5rem' }}>
                Ver operação de estorno
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="statement-detail__section-title">Lançamentos contábeis</h2>
        <div className="statement-detail__entries">
          <div className="statement-detail__entries-header">
            <span>Carteira</span>
            <span>Moeda</span>
            <span>Direção</span>
            <span>Valor</span>
            <span>Saldo após</span>
            <span>Data</span>
          </div>
          {detail.entries.map((entry, index) => (
            <div key={index} className="statement-detail__entries-row">
              <span className="statement-detail__mono">{entry.walletId}</span>
              <Badge variant="currency">{entry.currency}</Badge>
              <Badge variant="status">{entry.direction === 'CREDIT' ? 'Crédito' : 'Débito'}</Badge>
              <span>{formatMoneyMinor(entry.currency, entry.amountMinor)}</span>
              <span>{formatMoneyMinor(entry.currency, entry.balanceAfterMinor)}</span>
              <span>{formatDate(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
