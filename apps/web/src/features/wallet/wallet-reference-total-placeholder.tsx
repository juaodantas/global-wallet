import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export function WalletReferenceTotalPlaceholder() {
  return (
    <Card className="wallet-reference-total" aria-labelledby="wallet-reference-total-title">
      <div className="wallet-placeholder__header">
        <Badge variant="planned">Planejado</Badge>
        <span>Referência futura</span>
      </div>
      <h2 id="wallet-reference-total-title">Total convertido em moeda de referência</h2>
      <p>
        A carteira ainda não calcula totais convertidos. Quando o módulo de câmbio existir, esta área exibirá um valor informativo sem alterar os saldos reais por moeda.
      </p>
    </Card>
  );
}
