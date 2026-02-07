# Control Center - Frontend de Operacoes

Aplicacao frontend web para operacao de cadastros de usuarios com UX orientada a produtividade, RBAC, auditoria operacional e visualizacao de metricas da API.

## Visao Geral do Frontend

Este frontend foi desenhado para um contexto SaaS operacional, onde diferentes perfis (`viewer`, `editor`, `admin`) precisam navegar com clareza, executar tarefas rapidamente e manter rastreabilidade das acoes.

Fluxos principais:
1. Login seguro (`/api/v1/auth/login`)
2. Visualizacao contextual de sessao (usuario + papel)
3. Operacao de usuarios (busca, filtros, paginacao, CRUD e restore conforme permissao)
4. Auditoria e metricas para governanca (admin)

## Objetivo de Produto

- Reduzir tempo de execucao das tarefas de cadastro
- Melhorar previsibilidade de acoes por perfil
- Elevar confianca operacional com trilha de auditoria e saude da API
- Entregar experiencia moderna, acessivel e responsiva

## Stack e Tecnologias

- HTML5 semantico
- CSS3 com Design Tokens (`:root`)
- JavaScript ES Modules (Vanilla)
- API REST versionada (`/api/v1/*`)
- Node.js 18+ para servidor local

Sem framework de UI runtime, mantendo baixo overhead e facil manutencao.

## Arquitetura Frontend

Estrutura modular aplicada:

- `public/js/main.js`: orquestracao de fluxos e eventos
- `public/js/api-client.js`: camada de comunicacao HTTP
- `public/js/state.js`: estado da aplicacao e persistencia local
- `public/js/renderers.js`: renderizacao e estados de interface
- `public/js/dom.js`: fabrica de componentes DOM reutilizaveis
- `public/js/utils.js`: utilitarios (formatacao, debounce, CSV, normalizacoes)
- `public/js/feedback.js`: mensagens e toasts
- `public/js/constants.js`: tokens de comportamento e permissoes

Padrao adotado:
- Separacao por responsabilidade (SRP)
- UI declarativa por funcoes de render
- Estado centralizado e previsivel
- Integracao desacoplada da camada visual

## Design System (Resumo)

Tokens principais:
- Cor: `--color-brand`, `--color-danger`, `--color-success`, etc.
- Tipografia: `--font-heading` e `--font-body`
- Espacamentos: `--space-*`
- Sombras e raios: `--shadow-*`, `--radius-*`

Componentes:
- Buttons (`default`, `ghost`, `danger`, `block`)
- Cards e shells de conteudo
- Badges de status
- Tabela + cards responsivos
- Skeleton loading
- Dialog de confirmacao
- Toast notifications

## UX/UI e Features Implementadas

### 1. Jornada autenticada
- Login com gate inicial e contexto de sessao
- Logout explicito
- Comportamento da interface adaptado por papel (RBAC)

### 2. Operacao de usuarios
- Busca com debounce
- Ordenacao e paginacao
- Filtro de removidos (somente admin)
- Criacao/edicao/remocao/restauracao por permissao
- Copia rapida de email
- Exportacao CSV de resultados filtrados

### 3. Auditoria e observabilidade
- Aba dedicada para trilha de auditoria (admin)
- Aba de metricas operacionais (admin)
- KPIs principais no topo (total, ativos/removidos, latencia)

### 4. Produtividade
- Atalhos: `Ctrl+K` (busca), `Ctrl+Shift+R` (refresh)
- Persistencia local de preferencias (densidade, filtros, view ativa, sessao)

## Acessibilidade (WCAG-oriented)

- `skip-link` para navegacao por teclado
- foco visivel consistente (`:focus-visible`)
- `aria-live` para feedback de operacoes
- `aria-busy` em estados de carregamento
- labels explicitas e erros com `aria-invalid`
- dialog semantico para acoes criticas
- suporte a `prefers-reduced-motion`

## Responsividade

- Desktop: sidebar contextual + workspace
- Tablet: reorganizacao de grade e conteudo
- Mobile: tabela convertida para cards, filtros empilhados e acoes adaptadas

## Estrutura do Projeto

```text
.
|-- app.js
|-- server/
|   `-- create-server.js
|-- src/
|   |-- bootstrap/
|   |-- config.js
|   |-- data/
|   |-- lib/
|   |-- monitoring/
|   |-- security/
|   `-- services/
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
|       |-- storage.js
|       `-- utils.js
|-- docs/
|   `-- ux-ui-report.md
`-- tests/
```

## Setup e Execucao

### Pre-requisitos
- Node.js `>= 18`

### Instalacao
```bash
git clone https://github.com/matheussiqueira-dev/fake-api-js-async.git
cd fake-api-js-async
npm install
```

### Rodar aplicacao
```bash
npm run start
```

Acessos locais:
- App: `http://127.0.0.1:3333`
- OpenAPI: `http://127.0.0.1:3333/api/v1/openapi.json`

Credenciais locais:
- `admin / Admin@123`
- `editor / Editor@123`
- `viewer / Viewer@123`

### Desenvolvimento (watch)
```bash
npm run dev
```

### Testes
```bash
npm test
```

## Boas Praticas Adotadas

- Arquitetura frontend modular e escalavel
- Renderizacao eficiente com `DocumentFragment`
- Tratamento consistente de erros e mensagens
- Guardas de permissao no fluxo de UI
- Persistencia de estado com fallback seguro
- Contrato de API desacoplado da camada visual

## Melhorias Futuras

- Testes E2E (Playwright) com validacao de acessibilidade automatizada
- Storybook para catalogo de componentes do design system
- Internacionalizacao (i18n)
- Tema adicional (dark/high-contrast) via tokens
- Telemetria de UX (tempo por tarefa, abandono de fluxo)

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/