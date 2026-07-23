# Modelo financeiro

## Visão geral

O modelo financeiro do Global Wallet é baseado em ledger. Em vez de apenas alterar diretamente o saldo da carteira, cada movimentação gera uma operação financeira e lançamentos contábeis.

Essa abordagem preserva histórico, permite auditoria, facilita extrato e possibilita reversões por lançamento compensatório.

## Entidades principais

### User

Representa o usuário da aplicação.

Cada usuário possui uma carteira associada.

### Wallet

Representa a carteira financeira de um usuário.

A carteira concentra saldos por moeda e é a unidade usada para depósitos, transferências, câmbio e extrato.

### WalletBalance

Representa o saldo materializado de uma carteira em uma moeda específica.

Exemplo:

```txt
wallet_id: ...
currency: BRL
amount_minor: 15000
```

Esse exemplo representa R$ 150,00.

### FinancialOperation

Representa uma operação financeira de alto nível.

Tipos principais:

- `DEPOSIT`
- `TRANSFER`
- `EXCHANGE_CONVERSION`
- `REVERSAL`

Status principais:

- `COMPLETED`
- `REVERSED`

Uma operação financeira agrupa os lançamentos contábeis relacionados a uma ação do usuário.

### LedgerEntry

Representa um lançamento contábil individual.

Cada lançamento possui:

- carteira;
- moeda;
- direção;
- valor;
- saldo após o lançamento;
- operação financeira vinculada.

Direções possíveis:

- `CREDIT`: aumenta o saldo;
- `DEBIT`: reduz o saldo.

### Deposit

Representa um depósito criado pelo usuário.

O depósito pode iniciar como pendente e, quando confirmado, gera uma operação financeira e um lançamento de crédito.

### Transfer

Representa uma transferência entre duas carteiras.

Uma transferência gera uma operação financeira com dois lançamentos:

- débito na carteira de origem;
- crédito na carteira de destino.

### IdempotencyRecord

Representa uma solicitação financeira já processada ou em processamento para uma chave de idempotência.

Ajuda a impedir duplicidade quando o cliente reenvia a mesma operação.

## Valores monetários

Valores são armazenados como `amountMinor`, usando a menor unidade monetária, como centavos.

Exemplos:

```txt
R$ 10,00  -> amountMinor: 1000
R$ 99,90  -> amountMinor: 9990
US$ 25,50 -> amountMinor: 2550
```

Essa escolha evita problemas de precisão comuns em cálculos com números decimais.

## Saldo materializado e ledger

O sistema mantém duas visões complementares:

```txt
WalletBalance
  Saldo atual por carteira e moeda

LedgerEntry
  Histórico de lançamentos que explicam como o saldo chegou ao valor atual
```

O saldo materializado facilita consulta rápida. O ledger preserva rastreabilidade.

## Depósito

Um depósito confirmado gera crédito na carteira do usuário.

Exemplo:

```txt
Saldo inicial: BRL 0,00
Depósito:      BRL 100,00
Saldo final:   BRL 100,00
```

Representação contábil:

```txt
FinancialOperation: DEPOSIT

LedgerEntry:
  wallet: usuário
  currency: BRL
  direction: CREDIT
  amountMinor: 10000
  balanceAfterMinor: 10000
```

Se o saldo estiver negativo, o crédito é somado normalmente.

Exemplo:

```txt
Saldo inicial: BRL -30,00
Depósito:      BRL 100,00
Saldo final:   BRL 70,00
```

## Transferência

Uma transferência movimenta saldo entre duas carteiras.

Exemplo:

```txt
Carteira A: BRL 100,00
Carteira B: BRL 0,00

Transferência: BRL 25,00 de A para B

Carteira A após: BRL 75,00
Carteira B após: BRL 25,00
```

Representação contábil:

```txt
FinancialOperation: TRANSFER

LedgerEntry 1:
  wallet: carteira A
  direction: DEBIT
  amountMinor: 2500
  balanceAfterMinor: 7500

LedgerEntry 2:
  wallet: carteira B
  direction: CREDIT
  amountMinor: 2500
  balanceAfterMinor: 2500
```

## Validação de saldo

Transferências comuns não podem deixar a carteira de origem negativa.

A validação ocorre no banco durante a atualização do saldo:

```txt
aplicar débito apenas se amount_minor >= valor debitado
```

Se o saldo for insuficiente, a operação é recusada e a transação não aplica os lançamentos.

## Reversão

Reversões são feitas por compensação, não por remoção de histórico.

Quando uma operação é revertida:

1. uma nova `FinancialOperation` do tipo `REVERSAL` é criada;
2. lançamentos compensatórios são adicionados ao ledger;
3. a operação original é marcada como `REVERSED`.

Exemplo de reversão de depósito:

```txt
Operação original:
  CREDIT BRL 100,00

Reversão:
  DEBIT BRL 100,00
```

Isso preserva o histórico completo:

```txt
1. Depósito criado e confirmado
2. Depósito revertido por operação compensatória
```

## Câmbio

Conversões entre moedas seguem o mesmo princípio de ledger.

Uma conversão debita a moeda de origem e credita a moeda de destino.

Exemplo:

```txt
FinancialOperation: EXCHANGE_CONVERSION

LedgerEntry 1:
  currency: BRL
  direction: DEBIT

LedgerEntry 2:
  currency: USD
  direction: CREDIT
```

A cotação usada na conversão é preservada para manter rastreabilidade da operação.

## Idempotência financeira

Operações financeiras são sensíveis a retries.

Exemplo de risco:

```txt
Cliente envia transferência
Servidor processa com sucesso
Resposta se perde por falha de rede
Cliente tenta enviar novamente
```

Sem idempotência, a transferência poderia ser aplicada duas vezes.

Com idempotência, o sistema identifica que a operação já foi processada para aquela chave e retorna a resposta armazenada, sem criar nova movimentação.

## Consistência

As operações financeiras são executadas em transações de banco.

Isso garante que os efeitos relacionados sejam aplicados em conjunto:

```txt
criar operação financeira
aplicar saldos
criar ledger entries
persistir depósito/transferência/conversão
armazenar resposta idempotente
```

Se qualquer etapa falhar, a transação é revertida.

## Princípios do modelo

- Não apagar histórico financeiro.
- Não confiar em valores externos sem validação.
- Não usar ponto flutuante para dinheiro.
- Não permitir débito comum sem saldo suficiente.
- Registrar o saldo após cada lançamento.
- Tratar reversão como nova operação financeira.
- Preservar rastreabilidade entre operação, ledger e saldo.
