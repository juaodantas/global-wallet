# Product

## Register

product

## Users

Usuário final que quer gerenciar saldo em múltiplas moedas (BRL, USD, EUR, GBP). Acessa o app pelo navegador para consultar saldos, realizar depósitos, transferências, câmbio, consultar extrato e estornar operações.

## Product Purpose

Global Wallet é uma carteira multimoeda digital que permite ao usuário movimentar fundos entre moedas diferentes. O foco é fornecer uma experiência financeira clara, previsível e segura — sem surpresas, sem complexidade desnecessária. O sucesso é medido pela confiança do usuário ao realizar operações financeiras.

## Brand Personality

Seguro, moderno, direto.

- **Seguro**: a interface transmite estabilidade e confiança. Sem firulas, sem ambiguidade.
- **Moderno**: visual limpo, tipografia contemporânea, espaçamento generoso.
- **Direto**: cada tela comunica o essencial sem ruído. O usuário entende seu saldo e suas ações possíveis em segundos.

## Anti-references

- Não parecer um banco tradicional (visual pesado, muitas informações, jargão bancário).
- Não usar tons escuros e futuristas (cyberpunk, neon, dark mode como padrão).
- Não parecer um SaaS genérico com cards idênticos, gradientes e glassmorphism decorativo.
- Aproveitar o padrão visual já estabelecido no redesign anterior (Feature 11): azul como cor primária (#173a8a), superfície branca, fundo azul-claro (#f3f6fb), componentes locais sem frameworks externos.

## Design Principles

1. **Clareza acima de decoração**: cada elemento tem um propósito. Informações úteis são destacadas; ruído visual é eliminado.
2. **Consistência de padrões**: seguir o design system estabelecido (tokens CSS, componentes UI, shells). Features novas devem respeitar os mesmos padrões visuais das existentes.
3. **Hierarquia visual forte**: informações mais importantes (saldos, ações primárias) são visualmente dominantes. Metadados e UUIDs são secundários ou ocultos.
4. **Progressive disclosure**: ações complexas (câmbio, estorno) são divididas em etapas claras. O usuário nunca é surpreendido.
5. **Mobile-ready**: layout responsivo sem horizontal scroll, formulários usáveis em telas pequenas, navegação adaptável.

## Accessibility & Inclusion

- WCAG Level AA como baseline.
- Contraste mínimo 4.5:1 para texto corpo, 3:1 para texto grande.
- Estados de foco visíveis em todos os elementos interativos.
- Suporte a `prefers-reduced-motion`.
- Rótulos visíveis em todos os campos de formulário (não apenas placeholders).
- Mensagens de erro e sucesso associadas via `aria-describedby`.
- Locale pt-BR para todo texto visível ao usuário.
