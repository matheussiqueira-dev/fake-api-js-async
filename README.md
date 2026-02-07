# Fake API Async - Frontend Dashboard

Frontend profissional para gestao de usuarios em uma API assincrona simulada. A aplicacao foi redesenhada com foco em arquitetura escalavel, UX moderna, acessibilidade e performance de renderizacao.

## Visao Geral do Frontend

O frontend atende um fluxo operacional de cadastro com alta produtividade:
1. Buscar, filtrar e paginar usuarios.
2. Criar, editar e excluir registros.
3. Monitorar indicadores operacionais em tempo real.
4. Exportar resultados filtrados para CSV.

Publico-alvo:
- Times de produto e operacao que precisam de CRUD rapido e claro.
- Desenvolvedores estudando arquitetura frontend sem framework.
- Projetos que exigem base simples para evolucao futura.

## Analise Tecnica do Frontend (estado anterior)

Pontos identificados antes desta rodada:
- Logica concentrada em arquivo unico (`public/app.js`).
- Alto acoplamento entre estado, eventos e renderizacao.
- Pouca previsibilidade para evolucao de features.
- Falta de persistencia de preferencias de usuario.
- Ausencia de exportacao de dados e atalhos de produtividade.

## Refactor e Otimizacoes Aplicadas

### Arquitetura modular
- Migracao para `type="module"` com separacao por responsabilidade:
  - `public/js/api-client.js`: camada de acesso a dados.
  - `public/js/state.js`: estado da UI + persistencia.
  - `public/js/renderers.js`: renderizacao e estados visuais.
  - `public/js/dom.js`: fabrica de elementos reutilizaveis.
  - `public/js/utils.js`: formatacao, debounce e CSV.
  - `public/js/feedback.js`: toasts e mensagens de erro.
  - `public/js/main.js`: orquestracao de fluxos.

### Performance e renderizacao
- Debounce na busca (`260ms`) para reduzir chamadas concorrentes.
- Controle de corrida de requests (`inFlightUsersRequest`) para evitar render de resposta obsoleta.
- Skeleton loading para feedback imediato durante fetch.
- Renderizacao com `DocumentFragment` para minimizar repaints.

### Manutenibilidade
- Reuso de componentes de acao (editar, copiar email, excluir).
- Tokens de design centralizados no CSS (`:root`).
- Separacao clara entre regra de negocio da UI e efeitos visuais.

## UI/UX Refactor Completo

Direcao visual aplicada:
- Design system com tokens semanticos (cor, tipografia, espacamento, radius, sombra).
- Tipografia intencional (`Sora` + `Manrope`).
- Hierarquia visual forte entre painel principal e widgets laterais.
- Fundo atmosferico com profundidade e identidade visual consistente.
- Densidade alternavel (modo confortavel/compacto) para diferentes perfis de uso.

Microinteracoes:
- Feedback de hover/focus com contraste real.
- Animacoes curtas para entrada de linhas e toasts.
- `prefers-reduced-motion` respeitado.

## Acessibilidade, SEO e Responsividade

### Acessibilidade (WCAG-oriented)
- `skip-link` para navegacao por teclado.
- `aria-live` para feedback de operacoes.
- `aria-busy` em regioes de carregamento.
- estados de erro com `aria-invalid`.
- foco visivel em elementos interativos.
- estrutura semantica (`header`, `main`, `section`, `aside`, `dialog`).

### SEO tecnico (contexto SPA simples)
- `meta description`, `theme-color`, `og:title`, `og:description`, `og:type`.
- hierarquia adequada de headings.

### Responsividade
- Layout adaptativo desktop/tablet/mobile.
- Tabela em telas amplas e cards em telas menores.
- Grade responsiva para toolbar, metricas e formulario.

## Novas Features Implementadas

1. Exportacao CSV (filtros aplicados)
- Exporta resultados filtrados em multiplas paginas.
- Valor para operacao e analise offline.

2. Persistencia de filtros e preferencias
- Busca/ordenacao/limite e densidade visual sao mantidos em `localStorage`.
- Reduz friccao para usuarios recorrentes.

3. Alternador de densidade visual
- Modo compacto para cenarios de alta produtividade.
- Modo confortavel para leitura prolongada.

4. Acao rapida de copiar email
- Melhora fluxo de contato e operacao.

5. Atalho de teclado `Ctrl+K`
- Foco imediato no campo de busca.
- Acelera navegacao em ambientes operacionais.

## Stack e Tecnologias

- Node.js 18+
- HTML5 semantico
- CSS3 com design tokens
- JavaScript ES Modules (Vanilla)
- API REST local (`/api/*`)
- Testes backend com `node:test`

## Setup, Execucao e Build

### Pre-requisitos
- Node.js `>= 18`

### Instalacao
```bash
git clone https://github.com/matheussiqueira-dev/fake-api-js-async.git
cd fake-api-js-async
npm install
```

### Rodar ambiente local
```bash
npm run start
```
- App: `http://127.0.0.1:3333`

### Modo desenvolvimento
```bash
npm run dev
```

### Testes
```bash
npm test
```

## Estrutura do Projeto

```text
.
|-- app.js
|-- server/
|   `-- create-server.js
|-- src/
|   |-- config.js
|   |-- data/
|   |   `-- seed-users.js
|   |-- lib/
|   |   |-- errors.js
|   |   `-- validators.js
|   `-- services/
|       `-- user-service.js
|-- public/
|   |-- index.html
|   |-- styles.css
|   `-- js/
|       |-- api-client.js
|       |-- constants.js
|       |-- dom.js
|       |-- feedback.js
|       |-- main.js
|       |-- renderers.js
|       |-- state.js
|       `-- utils.js
`-- tests/
    `-- user-service.test.js
```

## Boas Praticas Adotadas

- Single responsibility por modulo.
- Estado previsivel com persistencia controlada.
- Tratamento de erro consistente e amigavel.
- Componentizacao sem framework com funcoes reutilizaveis.
- Sem dependencia externa para UI runtime.

## Melhorias Futuras

- Internacionalizacao (i18n) com fallback de locale.
- Testes E2E de interface (Playwright).
- Virtualizacao de listas para bases maiores.
- PWA com cache offline e install prompt.
- Dark theme opcional com tokens dedicados.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/