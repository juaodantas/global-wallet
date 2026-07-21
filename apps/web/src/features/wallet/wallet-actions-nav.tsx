import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

const availableActions = [{ label: 'Depósito', href: '/deposits' }, { label: 'Transferência', href: '/transfers' }, { label: 'Câmbio', href: '/exchange' }];
const plannedActions = ['Extrato', 'Estorno'];

export function WalletActionsNav() {
  return (
    <Card className="wallet-actions" aria-labelledby="wallet-actions-title">
      <div className="wallet-placeholder__header">
        <Badge variant="planned">Planejado</Badge>
        <span>Próximos fluxos</span>
      </div>
      <h2 id="wallet-actions-title">Ações da carteira</h2>
      <div className="wallet-actions__list" aria-label="Ações da carteira">
        {availableActions.map((action) => (
          <a key={action.href} className="wallet-actions__item" href={action.href}>{action.label}</a>
        ))}
        {plannedActions.map((action) => (
          <button key={action} className="wallet-actions__item" type="button" disabled>
            {action}
          </button>
        ))}
      </div>
    </Card>
  );
}
