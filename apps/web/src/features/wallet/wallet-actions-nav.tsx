import Link from 'next/link';
import { Card } from '../../components/ui/card';

const availableActions = [
  { label: 'Fazer depósito', href: '/deposits', priority: 'primary' },
  { label: 'Transferir dinheiro', href: '/transfers', priority: 'secondary' },
  { label: 'Converter moeda', href: '/exchange', priority: 'secondary' },
  { label: 'Ver extrato', href: '/statement', priority: 'secondary' },
];

export function WalletActionsNav() {
  return (
    <Card className="wallet-actions" aria-labelledby="wallet-actions-title">
      <h2 id="wallet-actions-title">Ações da carteira</h2>
      <div className="wallet-actions__list" aria-label="Ações da carteira">
        {availableActions.map((action) => (
          <Link key={action.href + action.label} href={action.href} className={`wallet-actions__item wallet-actions__item--active wallet-actions__item--${action.priority}`}>
            {action.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
