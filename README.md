# Fake API JS Async - Plataforma de Cadastros

Projeto Node.js com API REST assincrona e interface web moderna para gestao de usuarios. A solucao foi refeita com foco em arquitetura limpa, performance em memoria, seguranca de entrada de dados, UX profissional e preparo para evolucao em producao.

## Visao Geral do Projeto

O sistema simula um backend real com latencia controlada e oferece CRUD completo de usuarios, incluindo listagem com busca, ordenacao, paginacao, edicao e exclusao.

Publico-alvo principal:
- Devs que querem estudar APIs assincronas com boas praticas.
- Times que precisam de base didatica para evoluir para persistencia real.
- Recrutadores e avaliadores tecnicos buscando maturidade de codigo.

Fluxo principal:
1. Consumidor acessa o dashboard web.
2. Frontend consulta `GET /api/users` e `GET /api/stats`.
3. Usuario cria/edita/exclui registros via formulario.
4. API valida, aplica regras de negocio e responde com contratos padronizados.

## Analise Tecnica e Problemas Encontrados (Versao Original)

Principais pontos identificados no estado inicial:
- Arquitetura monolitica em poucos arquivos, sem separacao clara de responsabilidades.
- API simulada sem camada HTTP real para consumo frontend.
- Falta de validacoes robustas (formato, limites, unicidade de email).
- Ausencia de update, busca, ordenacao, paginacao e indicadores de negocio.
- Sem testes automatizados.
- Sem UX visual (apenas execucao em console).

## Melhorias e Otimizacoes Aplicadas

- Refactor para arquitetura em camadas:
  - `src/services`: regras de negocio.
  - `server`: transporte HTTP e roteamento.
  - `public`: UI/UX web desacoplada.
- Validacoes centralizadas e padronizacao de erros (`400/404/409/413/415/500`).
- Controles de seguranca:
  - limite de payload JSON;
  - protecao contra path traversal no static server;
  - escape de HTML no frontend.
- Melhor manutencao e escalabilidade:
  - servico orientado a metodos;
  - funcoes com responsabilidade unica;
  - contratos de resposta consistentes.
- Testes automatizados com `node:test` para fluxos criticos.

## Tecnologias Utilizadas

- Node.js 18+
- JavaScript (CommonJS)
- API HTTP nativa (`node:http`)
- Frontend Web Vanilla (HTML + CSS + JS)
- `node:test` + `assert` para testes

## Funcionalidades Principais

- CRUD completo de usuarios
- Listagem com:
  - busca textual (nome/email)
  - ordenacao (`id`, `name`, `email`, `createdAt`)
  - paginacao configuravel
- Indicadores de negocio:
  - total de usuarios
  - dominios de email mais frequentes
  - ultimos cadastros
- Estados de UI:
  - carregamento
  - sucesso/erro com toasts
  - edicao com cancelamento
  - confirmacao de exclusao

## Novas Features Implementadas

1. Dashboard de Operacao
- Interface profissional para operacao diaria dos cadastros, com alta legibilidade e fluxo rapido.

2. Filtro + Ordenacao + Paginacao no Backend
- Reduz custo de renderizacao no cliente e prepara terreno para migracao futura para banco de dados.

3. Indicadores Gerenciais
- Traz visao de negocio imediata (volume, padrao de dominios, recencia de registros).

4. Modo de Edicao In-Place
- Evita navegacao extra e reduz friccao no ajuste de cadastro existente.

5. Camada de Erros Estruturada
- Facilita observabilidade, troubleshooting e evolucao para logs centralizados.

## Refactor UI/UX (Nivel Senior)

Diretrizes aplicadas:
- Hierarquia visual forte com layout em duas areas (operacao + contexto).
- Tipografia intencional (`Space Grotesk` + `Manrope`).
- Paleta profissional (teal/amber) com contraste adequado.
- Microanimacoes com funcao real (entrada de contexto e linhas).
- Responsividade completa para desktop e mobile.
- Acessibilidade:
  - labels explicitas
  - `aria-live` para feedbacks
  - foco visivel
  - dialogo de confirmacao semanticamente correto

## Instalacao e Uso

### Pre-requisitos

- Node.js `>= 18`

### Passo a passo

```bash
git clone https://github.com/matheussiqueira-dev/fake-api-js-async.git
cd fake-api-js-async
npm install
npm run start
```

Aplicacao web:
- `http://127.0.0.1:3333`

### Modo desenvolvimento (watch)

```bash
npm run dev
```

### Rodar testes

```bash
npm test
```

## Endpoints da API

- `GET /api/health`
- `GET /api/users?search=&sortBy=&sortOrder=&page=&limit=`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/stats`

## Estrutura do Projeto

```text
.
|-- app.js
|-- api.js
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
|   `-- app.js
|-- tests/
|   `-- user-service.test.js
`-- README.md
```

## Boas Praticas Adotadas

- Separacao de responsabilidades por camada.
- Validacao de entrada antes de regra de negocio.
- Mensagens de erro consistentes para cliente.
- Nomes sem ambiguidades e fluxo legivel.
- Testes cobrindo cenarios de sucesso e falha.

## Possiveis Melhorias Futuras

- Persistencia em banco relacional/noSQL.
- Autenticacao e autorizacao por perfil (RBAC).
- Logs estruturados (pino/winston) e metricas.
- OpenAPI/Swagger para contrato de API.
- Containerizacao com Docker e CI/CD.
- Testes E2E para frontend.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/