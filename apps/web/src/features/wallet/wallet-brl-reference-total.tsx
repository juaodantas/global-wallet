import type { WalletBalanceDto } from '@global-wallet/contracts';
import { formatMoneyMinor } from '../../lib/format/money';
import { calculateBrlReferenceTotalMinor } from './brl-reference-total';
import type { BrlExchangeRatesState } from './use-brl-exchange-rates';

type WalletBrlReferenceTotalProps = {
  balances: WalletBalanceDto[];
  ratesState: BrlExchangeRatesState;
};

export function WalletBrlReferenceTotal({ balances, ratesState }: WalletBrlReferenceTotalProps) {
  if (ratesState.status === 'loading') {
    return <ReferenceTotalShell value="Carregando..." description="Informativo · cálculo aproximado com cotações atuais." />;
  }

  if (ratesState.status === 'error') {
    return <ReferenceTotalShell value="Indisponível" description="Informativo · saldos reais seguem separados por moeda." />;
  }

  const amountMinor = calculateBrlReferenceTotalMinor(balances, ratesState.data);

  if (amountMinor === null) {
    return <ReferenceTotalShell value="Indisponível" description="Informativo · cotações atuais incompletas." />;
  }

  return <ReferenceTotalShell value={formatMoneyMinor('BRL', amountMinor)} description="Informativo · valor aproximado em BRL." />;
}

function ReferenceTotalShell({ value, description }: { value: string; description: string }) {
  return (
    <div className="wallet-summary__reference" aria-label="Total de referência em BRL">
      <div className="wallet-summary__reference-label">Total de referência em BRL</div>
      <div className="wallet-summary__reference-amount">{value}</div>
      <div className="wallet-summary__reference-description">{description}</div>
    </div>
  );
}
