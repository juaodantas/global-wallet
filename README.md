# Global Wallet

Carteira financeira multimoeda para cadastro, autenticação, consulta de saldos, depósitos, transferências, câmbio, extrato e reversão de operações financeiras.

Aplicação hospedada em: [https://global-wallet--global-wallet-ad32b.us-central1.hosted.app/login](https://global-wallet--global-wallet-ad32b.us-central1.hosted.app/login)

## CI/CD

O projeto possui pipeline no GitHub Actions para validação e deploy automatizado. Em pull requests e pushes para `main` e `develop`, a pipeline instala as dependências, prepara o Prisma, aplica migrations em um banco PostgreSQL temporário, executa validações de código, checagem TypeScript e build.

Em pushes para `main` ou `develop`, após a validação, a pipeline aplica as migrations no banco Neon e publica a API no Firebase Functions e o frontend no Firebase App Hosting. As credenciais e variáveis sensíveis são lidas via GitHub Secrets e sincronizadas com o Secret Manager do Google Cloud para uso em produção.

## Tecnologias

- Node.js
- TypeScript
- Next.js
- Fastify
- Prisma
- PostgreSQL
- Zod
- Firebase App Hosting
- Firebase Functions
- Neon

## Funcionalidades

- Cadastro de usuário
- Login e logout com sessão via cookie HttpOnly
- Carteira criada automaticamente no cadastro
- Saldos em BRL, USD, EUR e GBP
- Depósito em BRL
- Transferência entre usuários
- Validação de saldo antes da transferência
- Consulta de extrato
- Consulta de detalhes de uma operação financeira
- Reversão de operações financeiras por lançamento compensatório
- Câmbio entre moedas suportadas
- Contratos compartilhados entre frontend e backend
- Server Actions no frontend

## Arquitetura

O projeto é organizado como um monorepo npm com aplicações e pacotes compartilhados.

```txt
apps/
  api/        API HTTP em Node.js/Fastify
  web/        Interface web em Next.js

packages/
  contracts/  Schemas Zod, tipos e contratos compartilhados

functions/    Adaptação da API para Firebase Functions
```

### Frontend

O frontend fica em `apps/web` e usa Next.js com App Router.

A interface consome a API por meio de uma camada própria em `src/lib/api` e usa Server Actions em `src/lib/actions` para fluxos de escrita, como autenticação, depósito, transferência, câmbio e reversão.

As telas principais ficam em:

```txt
apps/web/src/app/
  login/
  register/
  deposits/
  transfers/
  exchange/
  statement/
```

Os componentes e fluxos de produto ficam em:

```txt
apps/web/src/components/
apps/web/src/features/
```

### Backend

O backend fica em `apps/api` e é dividido por módulos de domínio.

```txt
apps/api/src/modules/
  auth/
  wallet/
  deposits/
  transfers/
  ledger/
  reversals/
  statement/
  exchange/
```

Cada módulo segue, quando aplicável, a separação:

```txt
application/      Casos de uso, serviços e portas
domain/           Tipos, regras e erros de domínio
http/             Rotas HTTP
infrastructure/   Implementações com Prisma ou provedores externos
```

A API é construída em `apps/api/src/app.ts`, onde as dependências são compostas e as rotas são registradas.

### Contracts

O pacote `packages/contracts` concentra os schemas Zod e tipos compartilhados entre frontend e backend.

Essa abordagem reduz divergência entre payloads enviados pelo frontend e payloads aceitos pela API, mantendo validação explícita nas fronteiras da aplicação.

## Modelo financeiro

O sistema usa um modelo baseado em ledger.

As principais entidades são:

- `User`
- `Wallet`
- `WalletBalance`
- `FinancialOperation`
- `LedgerEntry`
- `Deposit`
- `Transfer`
- `ExchangeQuote`
- `ExchangeConversion`
- `IdempotencyRecord`

Cada movimentação financeira gera uma `FinancialOperation` e uma ou mais `LedgerEntry`.

O saldo atual fica materializado em `WalletBalance`, enquanto o histórico contábil fica preservado em `LedgerEntry`.

Exemplo de transferência:

```txt
FinancialOperation: TRANSFER

LedgerEntry 1: DEBIT  na carteira de origem
LedgerEntry 2: CREDIT na carteira de destino
```

Exemplo de depósito confirmado:

```txt
FinancialOperation: DEPOSIT

LedgerEntry 1: CREDIT na carteira do usuário
```

Exemplo de reversão:

```txt
FinancialOperation: REVERSAL

LedgerEntry compensatória invertendo o efeito da operação original
```

## Regras de negócio

### Cadastro e autenticação

Ao criar uma conta, o sistema também cria uma carteira para o usuário com saldos zerados nas moedas suportadas.

A autenticação usa cookie HttpOnly assinado, evitando expor token de sessão ao JavaScript do navegador.

### Depósito

O depósito nasce como pendente e depois pode ser confirmado.

Na confirmação, o saldo da carteira é incrementado. Caso o saldo esteja negativo por algum motivo, o valor depositado é somado normalmente ao saldo atual. Exemplo: se uma reversão anterior deixou o saldo em -R$ 40,00, um depósito confirmado de R$ 100,00 leva o saldo para R$ 60,00.

### Transferência

Antes de transferir, o sistema valida se a carteira de origem possui saldo suficiente na moeda selecionada.

A validação e a alteração do saldo ocorrem dentro de transação no banco, reduzindo risco de inconsistência em operações concorrentes.

### Reversão

A reversão é representada como uma nova operação financeira do tipo `REVERSAL`.

Em vez de apagar ou alterar o histórico original, o sistema cria lançamentos compensatórios no ledger e marca a operação original como revertida.

Exemplo: se um depósito de R$ 50,00 foi confirmado e depois o usuário transferiu R$ 40,00, o saldo fica em R$ 10,00. Ao estornar o depósito original, o sistema lança um débito compensatório de R$ 50,00; por isso o saldo pode ficar negativo em -R$ 40,00.

### Idempotência

Operações financeiras críticas usam chave de idempotência.

Isso evita que uma mesma solicitação seja aplicada mais de uma vez em cenários de retry, falha de rede ou reenvio acidental pelo cliente.

## Infraestrutura

### Firebase App Hosting

O Next.js está publicado no Firebase App Hosting.

A escolha foi feita por integração direta com aplicações Next.js, build gerenciado, deploy simplificado e boa aderência para uma interface web que precisa ser disponibilizada sem administrar servidores próprios.

### Firebase Functions

A API roda em Firebase Functions, expondo o app Fastify por meio de uma função HTTP.

Essa escolha mantém o backend em Node.js, permite escalar sob demanda e reduz a operação de infraestrutura para uma API de escopo bem definido.

As secrets da API, como URL do banco e segredo de sessão, são injetadas pelo ambiente de Functions.

### Neon

O banco de dados PostgreSQL está hospedado na Neon.

A escolha foi feita por oferecer PostgreSQL gerenciado, provisionamento simples, conexão compatível com Prisma e boa experiência para ambientes serverless.

### Prisma

O Prisma é usado como camada de acesso ao banco e controle de schema.

Ele centraliza a modelagem relacional, migrations e acesso tipado às entidades persistidas.

## Segurança

- Senhas armazenadas com hash `scrypt` e salt aleatório
- Sessão em cookie HttpOnly
- Cookie com `SameSite=Lax`
- Cookie `secure` em ambiente de produção
- Validação de entrada com Zod
- Validação de variáveis de ambiente com Zod
- Contratos compartilhados entre frontend e backend
- Operações financeiras executadas dentro de transações
- Idempotência em operações críticas
- Secrets mantidas fora do código-fonte

## Principais endpoints

### Autenticação

```http
POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me
```

### Carteira

```http
GET /wallet
```

### Depósitos

```http
POST /deposits
POST /deposits/:depositId/confirm
GET /deposits
```

### Transferências

```http
POST /transfers
GET /transfers
```

### Extrato

```http
GET /statement
GET /statement/:operationId
```

### Reversão

```http
POST /financial-operations/:operationId/reversal
```

### Câmbio

```http
GET /exchange/rates
POST /exchange/quotes
POST /exchange/conversions
```

## Como rodar localmente

### Pré-requisitos

- Node.js
- npm
- Docker

### Instalar dependências

```bash
npm install
```

### Configurar variáveis de ambiente

Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis principais:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/global_wallet?schema=public
JWT_SECRET=replace-with-a-long-random-secret
WEB_ORIGIN=http://localhost:3000
```

### Rodar aplicação

```bash
npm run dev
```

Esse comando sobe o PostgreSQL local, aplica migrations, gera o Prisma Client e inicia API e frontend.

URLs locais:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Healthcheck: `http://localhost:3001/health`

## Scripts úteis

```bash
npm run dev
```

Roda banco local, API e frontend.

```bash
npm run dev:api
```

Roda apenas a API.

```bash
npm run dev:web
```

Roda apenas o frontend.

```bash
npm run build
```

Gera build dos workspaces.

```bash
npm run typecheck
```

Executa validação TypeScript.

```bash
npm run db:up
```

Sobe o PostgreSQL local.

```bash
npm run db:down
```

Encerra o PostgreSQL local.

## Decisões técnicas

### Ledger para operações financeiras

O projeto usa ledger para preservar histórico, facilitar auditoria e permitir reversões por lançamento compensatório.

Atualizar apenas o saldo seria mais simples, mas dificultaria rastreabilidade e explicação das movimentações.

### Valores monetários em unidades menores

Os valores são armazenados como `amountMinor`, usando unidades menores da moeda, como centavos.

Isso evita problemas de precisão com números decimais em operações financeiras.

### Fastify na API

Fastify foi escolhido para manter a API enxuta, explícita e com baixo overhead.

A separação modular em camadas preserva organização e testabilidade sem depender de uma estrutura mais opinativa.

### Zod nas fronteiras

Zod é usado para validar entradas externas, contratos compartilhados e variáveis de ambiente.

Isso deixa explícito o formato esperado dos dados antes que eles entrem nas regras de aplicação.
