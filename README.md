# Fake API JS Async - Backend Platform

Backend Node.js para gestao de usuarios com API versionada, seguranca por RBAC, tokens com refresh rotativo, idempotencia de escrita, auditoria e observabilidade operacional.

## Visao Geral do Backend

Dominio de negocio:
- Gestao de usuarios (CRUD, soft delete e restore)
- Controle de acesso por papel (`viewer`, `editor`, `admin`)
- Auditoria de eventos criticos
- Monitoramento de saude e uso da API

Valor entregue:
- Operacao segura para times de cadastro
- Governanca para administracao
- Base tecnica preparada para evolucao para persistencia externa

## Arquitetura Adotada

Estilo arquitetural: **modular monolith** (camadas explicitas, baixo acoplamento, alta testabilidade).

Camadas principais:
- `src/bootstrap`: composition root e injecao de dependencias
- `src/services`: regras de negocio e aplicacao
- `src/security`: token, hash, RBAC, rate limit
- `src/monitoring`: metricas e logging estruturado
- `server`: adaptador HTTP (roteamento, serializacao, seguranca)

Princpios aplicados:
- SRP e separacao de responsabilidades
- DRY em validacoes e contratos de erro
- fail-fast para input invalido
- contratos previsiveis de resposta

## Analise Tecnica e Melhorias Aplicadas

### Arquitetura e escalabilidade
- Refatoracao do contexto da aplicacao com dependencias injetadas (`create-app-context`).
- Estrutura orientada a servicos para facilitar manutencao e evolucao.
- `UserService` com `Map` para acesso por id em O(1).

### Performance e confiabilidade
- Rate limit global e rate limit especifico para login.
- Timeout de requisicao configuravel.
- Idempotencia em endpoints de escrita para evitar duplicacao por retries.
- Paginacao em listas e auditoria.

### Seguranca
- Access token + refresh token com assinatura HMAC SHA-256.
- Rotacao de refresh token em `/auth/refresh`.
- Revogacao de sessao em `/auth/logout`.
- Lockout temporario apos tentativas de login falhas.
- Headers de seguranca HTTP (CSP, X-Frame-Options, HSTS, etc).
- CORS por allowlist configuravel.

### Tratamento de erros
- Erros tipados (`UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `TOO_MANY_REQUESTS`, etc).
- Resposta padronizada com `error.code`, `message`, `details` e `meta.requestId`.

## API e Integracoes

### Rotas legadas (compatibilidade)
- `/api/*` permanece ativo para compatibilidade com clientes anteriores.

### API versionada (`/api/v1`)

Auth:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/session-stats` (admin)

Users:
- `GET /api/v1/users`
- `POST /api/v1/users` (editor+)
- `POST /api/v1/users/bulk` (admin)
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id` (editor+)
- `DELETE /api/v1/users/:id` (admin)
- `POST /api/v1/users/:id/restore` (admin)

Observabilidade:
- `GET /api/v1/stats`
- `GET /api/v1/audit-logs` (admin)
- `GET /api/v1/metrics` (admin)
- `GET /api/v1/openapi.json`

## Novas Features Implementadas

1. Refresh token com rotacao
- Impacto: sessao mais segura e preparada para fluxos de longa duracao.

2. Logout com revogacao de sessao
- Impacto: controle de sessao explicito e mitigacao de uso indevido de refresh token.

3. Login lockout
- Impacto: reduz risco de brute force em credenciais.

4. Idempotencia em escrita
- Impacto: evita duplicacao acidental em retries de rede.

5. Rate limit especifico de login
- Impacto: camada adicional de protecao sem penalizar leitura normal da API.

## Tecnologias Utilizadas

- Node.js 18+
- JavaScript (CommonJS)
- `node:http`
- `crypto` nativo (HMAC + scrypt)
- Testes com `node:test` e `assert`

## Setup e Execucao

### Pre-requisitos
- Node.js `>= 18`

### Instalacao
```bash
git clone https://github.com/matheussiqueira-dev/fake-api-js-async.git
cd fake-api-js-async
npm install
```

### Executar aplicacao
```bash
npm run start
```

Endpoints locais:
- App/API: `http://127.0.0.1:3333`
- OpenAPI: `http://127.0.0.1:3333/api/v1/openapi.json`

Credenciais locais padrao:
- `admin / Admin@123`
- `editor / Editor@123`
- `viewer / Viewer@123`

### Desenvolvimento
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
|-- api.js
|-- server/
|   `-- create-server.js
|-- src/
|   |-- bootstrap/
|   |   `-- create-app-context.js
|   |-- config.js
|   |-- data/
|   |   `-- seed-users.js
|   |-- lib/
|   |   |-- errors.js
|   |   `-- validators.js
|   |-- monitoring/
|   |   |-- metrics-registry.js
|   |   `-- request-logger.js
|   |-- security/
|   |   |-- access-control.js
|   |   |-- password-service.js
|   |   |-- rate-limiter.js
|   |   `-- token-service.js
|   `-- services/
|       |-- audit-service.js
|       |-- auth-service.js
|       |-- idempotency-service.js
|       |-- session-service.js
|       `-- user-service.js
|-- public/
|-- tests/
|   |-- api-v1.test.js
|   |-- auth-service.test.js
|   `-- user-service.test.js
`-- README.md
```

## Boas Praticas e Padroes

- Camadas bem definidas e baixo acoplamento
- Validacao de entrada centralizada
- Controle de acesso por papel no backend
- Auditoria de eventos sensiveis
- Observabilidade com metricas e logs estruturados
- Testes de unidade e integracao cobrindo fluxos criticos

## Melhorias Futuras

- Persistencia em PostgreSQL com migracoes
- Rotacao automatica de segredo e key management
- Revogacao de access token por blacklist distribuida
- Exportadores OpenTelemetry/Prometheus
- CI/CD com quality gates, SAST e DAST
- Canary releases e politicas de rollback

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/