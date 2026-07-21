import type { WalletBalanceDto } from '@global-wallet/contracts';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { formatMoneyMinor } from '../../lib/format/money';

type WalletBalanceCardProps = { balance: WalletBalanceDto };

export function WalletBalanceCard({ balance }: WalletBalanceCardProps) {
  return (
    <Card variant="emphasis" className="balance-card">
      <Badge variant="currency">{balance.currency}</Badge>
      <div className="balance-card__amount">{formatMoneyMinor(balance.currency, balance.amountMinor)}</div>
      <div className="balance-card__label">Saldo disponível nos dados da carteira</div>
    </Card>
  );
}
