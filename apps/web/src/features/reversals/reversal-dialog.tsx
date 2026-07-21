'use client';

import { useState } from 'react';
import type { ReversalDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field } from '../../components/ui/field';
import { reversalOperation } from '../../lib/api/reversal-api';

type ReversalDialogProps = {
  operationId: string;
  operationType: string;
  onSuccess: (result: ReversalDto) => void;
  onError?: (message: string) => void;
};

const reversibleTypes = ['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION'];

export function ReversalDialog({ operationId, operationType, onSuccess, onError }: ReversalDialogProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reversibleTypes.includes(operationType)) {
    return null; // Not reversible, don't render
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const result = await reversalOperation(operationId, reason || undefined);
      onSuccess(result);
      setShowConfirm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado.';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  if (!showConfirm) {
    return (
      <Button variant="secondary" onClick={() => setShowConfirm(true)}>
        Estornar operação
      </Button>
    );
  }

  return (
    <Card>
      <h3>Confirmar estorno</h3>
      <p>Tem certeza que deseja estornar esta operação? Esta ação criará lançamentos compensatórios e não pode ser desfeita.</p>
      <Field
        id="reversal-reason"
        label="Motivo (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Descreva o motivo do estorno"
      />
      {error ? <p className="field__error">{error}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button loading={loading} onClick={handleConfirm}>
          {loading ? 'Estornando…' : 'Confirmar estorno'}
        </Button>
        <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
