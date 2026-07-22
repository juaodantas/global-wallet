'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StatementItemDto } from '@global-wallet/contracts';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { formatMoneyMinor } from '../../lib/format/money';
import { listStatement } from '../../lib/api/statement-api';

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

export function WalletRecentActivityPlaceholder() {
  const [items, setItems] = useState<StatementItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listStatement()
      .then((result) => {
        if (active) setItems(result.items.slice(0, 5));
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <Card className="wallet-recent-activity" aria-labelledby="wallet-recent-activity-title">
      <h2 id="wallet-recent-activity-title">Atividade recente</h2>
      {loading ? (
        <p className="wallet-recent-activity__empty">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="wallet-recent-activity__empty">
          Nenhuma movimentação encontrada.
        </p>
      ) : (
        <div className="wallet-recent-activity__list">
          {items.map((item) => (
            <Link
              key={item.operationId}
              href={`/statement/${item.operationId}`}
              className="wallet-recent-activity__item"
            >
              <div className="wallet-recent-activity__item-header">
                <Badge variant="status">{directionLabels[item.direction]}</Badge>
                <Badge variant="currency">{item.currency}</Badge>
                <span className="wallet-recent-activity__type">{typeLabels[item.type]}</span>
              </div>
              <div className="wallet-recent-activity__item-amount">
                {formatMoneyMinor(item.currency, item.amountMinor)}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Link href="/statement" className="wallet-recent-activity__link">
        Ver extrato completo →
      </Link>
    </Card>
  );
}
