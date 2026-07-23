# Arquitetura

## Visão geral

Global Wallet é organizado como um monorepo npm com separação entre interface web, API, contratos compartilhados e adaptação para deploy serverless.

```txt
apps/
  api/        API HTTP em Node.js/Fastify
  web/        Interface web em Next.js

packages/
  contracts/  Schemas Zod, tipos e contratos compartilhados

functions/    Wrapper da API para execução em Firebase Functions
```

A arquitetura prioriza fronteiras explícitas entre UI, aplicação, domínio, infraestrutura e contratos. A comunicação entre frontend e backend é feita por HTTP, com validação dos dados nas fronteiras usando Zod.

## Frontend

O frontend está em `apps/web` e usa Next.js com App Router.

Principais responsabilidades:

- renderizar telas e fluxos de produto;
- gerenciar estados de formulário e feedback visual;
- chamar a API por meio de uma camada dedicada;
- executar fluxos de escrita com Server Actions;
- validar payloads com os contratos compartilhados.

Estrutura principal:

```txt
apps/web/src/app/          Rotas e páginas Next.js
apps/web/src/components/   Componentes reutilizáveis de layout e UI
apps/web/src/features/     Fluxos específicos do produto
apps/web/src/lib/api/      Cliente HTTP para a API
apps/web/src/lib/actions/  Server Actions
```

As páginas usam componentes de `features` para manter a lógica de cada fluxo fora da camada de roteamento do Next.js.

## Backend

O backend está em `apps/api` e usa Fastify como servidor HTTP.

A composição da aplicação acontece em `apps/api/src/app.ts`, onde são criados os serviços, repositórios e providers necessários para registrar as rotas.

Módulos principais:

```txt
apps/api/src/modules/
  auth/       Cadastro, login, sessão e usuário autenticado
  wallet/     Consulta e criação de carteira
  deposits/   Criação, confirmação e listagem de depósitos
  transfers/  Transferências entre carteiras
  ledger/     Registro contábil e aplicação atômica de saldos
  reversals/  Estorno de operações financeiras
  statement/  Extrato e detalhes de operações
  exchange/   Cotação e conversão entre moedas
```

Cada módulo segue, quando aplicável, a divisão:

```txt
application/      Casos de uso, serviços e portas
domain/           Tipos, regras e erros de domínio
http/             Rotas HTTP e adaptação de request/response
infrastructure/   Persistência, Prisma e integrações externas
```

Essa estrutura evita que regras de negócio fiquem acopladas aos handlers HTTP ou aos detalhes do Prisma.

## Contracts

O pacote `packages/contracts` concentra schemas Zod, tipos e códigos compartilhados entre frontend e backend.

Responsabilidades:

- definir payloads aceitos pela API;
- validar respostas consumidas pelo frontend;
- centralizar formatos de moedas, operações, saldos e erros;
- reduzir divergência entre camadas.

Exemplo de uso:

```txt
Frontend form -> contract schema -> Server Action -> API -> contract schema -> service
```

## Fluxo de autenticação

1. O usuário envia dados para cadastro ou login.
2. A API valida o payload com Zod.
3. No cadastro, a senha é transformada em hash com `scrypt` e salt aleatório.
4. O usuário é criado no banco.
5. Uma carteira é criada automaticamente para o usuário.
6. A API define um cookie de sessão HttpOnly.
7. Requisições autenticadas leem e verificam esse cookie.

O cookie é assinado e não expõe token de sessão para o JavaScript do navegador.

## Fluxo de depósito

1. O usuário cria um depósito.
2. O depósito é registrado como `PENDING`.
3. Na confirmação, a API abre uma transação.
4. O ledger cria uma operação financeira do tipo `DEPOSIT`.
5. Um lançamento `CREDIT` é aplicado na carteira.
6. O saldo materializado é incrementado.
7. O depósito é associado à operação financeira.

## Fluxo de transferência

1. O usuário informa e-mail do destinatário, moeda e valor.
2. A API valida o payload e a sessão.
3. O serviço localiza a carteira de origem e a carteira de destino.
4. A API impede transferência para o mesmo usuário.
5. O ledger cria uma operação financeira do tipo `TRANSFER`.
6. O saldo da origem é debitado somente se houver saldo suficiente.
7. O saldo do destino é creditado.
8. A transferência é persistida com referência à operação financeira.

A validação de saldo ocorre no banco, dentro da transação, para reduzir risco de inconsistência em concorrência.

## Fluxo de reversão

1. O usuário solicita reversão de uma operação financeira.
2. A API valida se a operação existe e pertence ao escopo do usuário.
3. A API verifica se a operação ainda não foi revertida.
4. O sistema cria uma nova operação do tipo `REVERSAL`.
5. O ledger cria lançamentos compensatórios com direção invertida.
6. A operação original é marcada como `REVERSED`.

A reversão não apaga histórico. Ela adiciona um novo evento financeiro que explica a compensação.

## Idempotência

Operações financeiras críticas usam chave de idempotência.

Objetivo:

- evitar duplicidade em retries;
- impedir reaplicação de uma operação já processada;
- detectar conflito quando a mesma chave é reutilizada com payload diferente.

O backend persiste registros de idempotência em `IdempotencyRecord` e usa hash canônico do payload para comparar reenvios.

## Infraestrutura de produção

```txt
Browser
  -> Firebase App Hosting / Next.js
  -> Firebase Functions / Fastify API
  -> Neon / PostgreSQL
```

- O Next.js roda no Firebase App Hosting.
- A API Fastify roda em Firebase Functions.
- O PostgreSQL é gerenciado pela Neon.
- Secrets ficam fora do código e são injetadas em produção.

## CI/CD

A pipeline no GitHub Actions valida pull requests e pushes para `main` e `develop`.

Etapas principais:

1. instalar dependências;
2. gerar Prisma Client;
3. aplicar migrations em banco PostgreSQL temporário;
4. executar validações TypeScript e build;
5. aplicar migrations no Neon em pushes autorizados;
6. publicar API no Firebase Functions;
7. publicar frontend no Firebase App Hosting.

As variáveis sensíveis são lidas via GitHub Secrets e sincronizadas com o Secret Manager do Google Cloud para a API em produção.
