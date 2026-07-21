import Link from 'next/link';
import { Card } from '../../components/ui/card';

const availableActions = [
  { label: 'Depósito', href: '/deposits' },
  { label: 'Transferência', href: '/transfers' },
  { label: 'Câmbio', href: '/exchange' },
  { label: 'Extrato', href: '/statement' },
  { label: 'Estorno', href: '/statement' },
];

export function WalletActionsNav() {
  return (
    <Card className="wallet-actions" aria-labelledby="wallet-actions-title">
      <h2 id="wallet-actions-title">Ações da carteira</h2>
      <div className="wallet-actions__list" aria-label="Ações da carteira">
        {availableActions.map((action) => (
          <Link key={action.href + action.label} href={action.href} className="wallet-actions__item wallet-actions__item--active">
            {action.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
