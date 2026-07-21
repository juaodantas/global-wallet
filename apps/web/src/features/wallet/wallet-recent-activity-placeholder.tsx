import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export function WalletRecentActivityPlaceholder() {
  return (
    <Card className="wallet-recent-activity" aria-labelledby="wallet-recent-activity-title">
      <div className="wallet-placeholder__header">
        <Badge variant="planned">Planejado</Badge>
        <span>Histórico futuro</span>
      </div>
      <h2 id="wallet-recent-activity-title">Atividade recente</h2>
      <p>Nenhuma movimentação é exibida nesta feature. Depósitos, transferências, câmbio e estornos serão listados aqui quando o extrato for implementado.</p>
      <div className="wallet-recent-activity__empty">Sem atividade disponível nesta etapa.</div>
    </Card>
  );
}
