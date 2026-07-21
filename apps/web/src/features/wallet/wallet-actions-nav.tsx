import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

const plannedActions = ['Depósito', 'Transferência', 'Câmbio', 'Extrato', 'Estorno'];

export function WalletActionsNav() {
  return (
    <Card className="wallet-actions" aria-labelledby="wallet-actions-title">
      <div className="wallet-placeholder__header">
        <Badge variant="planned">Planejado</Badge>
        <span>Próximos fluxos</span>
      </div>
      <h2 id="wallet-actions-title">Ações da carteira</h2>
      <div className="wallet-actions__list" aria-label="Ações planejadas da carteira">
        {plannedActions.map((action) => (
          <button key={action} className="wallet-actions__item" type="button" disabled>
            {action}
          </button>
        ))}
      </div>
    </Card>
  );
}
