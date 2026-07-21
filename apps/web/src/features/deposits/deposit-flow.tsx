'use client';

import { useEffect, useState } from 'react';
import type { DepositDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field } from '../../components/ui/field';
import { PageHeader } from '../../components/ui/page-header';
import { formatMoneyMinor } from '../../lib/format/money';
import { confirmDeposit, createDeposit, listDeposits } from '../../lib/api/deposit-api';

export function DepositFlow() {
  const [amount, setAmount] = useState('');
  const [deposits, setDeposits] = useState<DepositDto[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setDeposits(await listDeposits());
  }

  async function submit() {
    setLoading(true);
    setMessage(undefined);
    try {
      await createDeposit(Math.round(Number(amount) * 100));
      setAmount('');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm(depositId: string) {
    setLoading(true);
    setMessage(undefined);
    try {
      await confirmDeposit(depositId);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wallet-dashboard">
      <PageHeader
        eyebrow="Depósito"
        title="Adicionar BRL"
        description="Crie um depósito simulado e confirme para creditar o saldo."
      />
      <Card>
        <Field
          id="amount"
          label="Valor em BRL"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <div className="form-actions">
          <Button loading={loading} onClick={submit}>
            Criar depósito
          </Button>
        </div>
        {message ? <p className="field__error">{message}</p> : null}
      </Card>
      <Card>
        <h2>Histórico de depósitos</h2>
        {deposits.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', margin: 0 }}>Nenhum depósito realizado ainda.</p>
        ) : (
          <div className="history-list">
            {deposits.map((deposit) => (
              <div key={deposit.depositId} className="history-list__item">
                <div className="history-list__item-main">
                  <span className="history-list__amount">
                    {formatMoneyMinor('BRL', deposit.amountMinor)}
                  </span>
                  <span className="history-list__meta">
                    {deposit.status === 'PENDING' ? 'Pendente' : 'Confirmado'}
                  </span>
                </div>
                <div className="history-list__actions">
                  {deposit.status === 'PENDING' ? (
                    <Button variant="secondary" onClick={() => confirm(deposit.depositId)}>
                      Confirmar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
