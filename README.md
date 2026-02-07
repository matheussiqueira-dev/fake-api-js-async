# Fake API JS Async - Backend Profissional

Backend HTTP em Node.js para gestao de usuarios com arquitetura modular, API versionada, seguranca por token Bearer, RBAC, rate limiting, auditoria e metricas operacionais.

## Visao Geral do Backend

Dominio principal:
- Gestao de usuarios (CRUD com soft delete e restore)
- Estatisticas operacionais da base
- Auditoria de eventos criticos

Regras de negocio principais:
- Email unico entre usuarios ativos
- Validacao rigorosa de entrada
- Exclusao logica (soft delete), sem perda imediata de historico
- Controle de acesso por papel (`admin`, `editor`, `viewer`)

## Analise Tecnica do Estado Inicial

Antes do refactor backend, os principais pontos eram:
- Roteamento e regras de infraestrutura concentrados em um unico arquivo.
- Ausencia de autenticacao/autorizacao robusta.
- Sem versionamento formal da API.
- Baixa observabilidade (sem metricas estruturadas e auditoria completa).
- Sem protecao consistente contra abuso (rate limit) e politicas de seguranca HTTP.

## Arquitetura Adotada

Estilo: **modular monolith** com separacao por responsabilidades (inspirado em Clean Architecture).

Camadas:
- **Bootstrap/Composition Root**: cria dependencias e contexto da aplicacao.
- **Services (dominio/aplicacao)**: regras de usuarios, autenticacao e auditoria.
- **Security**: token JWT-like assinado, hash de senha, RBAC e rate limiter.
- **HTTP Adapter**: roteamento, validacao de request, serializacao de resposta e compatibilidade legada.
- **Monitoring**: logs estruturados e metricas de requests.

## Tecnologias Utilizadas

- Node.js 18+
- JavaScript (CommonJS)
- API HTTP nativa (`node:http`)
- `crypto` nativo para assinatura de token e hash de senha (`scrypt`)
- Testes com `node:test` + `assert`

## Refactor e Otimizacoes Implementadas

### 1. Estrutura e desacoplamento
- Introduzido `src/bootstrap/create-app-context.js` para injetar dependencias.
- Quebra de responsabilidades em modulos dedicados:
  - `src/services/*`
  - `src/security/*`
  - `src/monitoring/*`
  - `server/create-server.js` com fluxo HTTP mais robusto

### 2. Performance e confiabilidade
- Rate limiting por IP em memoria.
- Timeout de request configuravel para evitar pendencias indefinidas.
- Uso de `Map` no `UserService` para acesso O(1) por ID.
- Metricas de status, rota e latencia media.

### 3. Padronizacao de erros
- Erros tipados (`Validation`, `Unauthorized`, `Forbidden`, `Conflict`, `TooManyRequests`).
- Payload de erro consistente com `code`, `message`, `details` e `requestId`.

## Seguranca e Confiabilidade

Implementacoes aplicadas:
- **Autenticacao** via Bearer token assinado (HMAC SHA-256).
- **Autorizacao RBAC**:
  - `viewer`: leitura
  - `editor`: criacao/edicao
  - `admin`: exclusao, restore, auditoria, metricas, bulk
- **Protecoes HTTP**:
  - CSP
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - HSTS
- **Rate limiting** global para rotas `/api/*`.
- **Validacao de payload** e limite de tamanho de body.
- **CORS restrito** por allowlist configuravel.

Observacao sobre ataques comuns:
- SQLi nao se aplica diretamente ao estado atual em memoria (sem SQL), mas o design foi preparado para uso de repositorios e validacao na fronteira HTTP.
- XSS mitigado por respostas JSON e politicas CSP.

## API e Integracoes

### Compatibilidade legada
- Rotas `/api/*` permanecem funcionais para o frontend atual.
- Headers de deprecacao foram adicionados para migracao gradual para `/api/v1`.

### API versionada (`/api/v1`)
- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `POST /api/v1/users/bulk`
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `POST /api/v1/users/:id/restore`
- `GET /api/v1/stats`
- `GET /api/v1/audit-logs`
- `GET /api/v1/metrics`
- `GET /api/v1/openapi.json`

## Novas Features de Backend Implementadas

1. **Autenticacao + RBAC**
- Impacto: protege operacoes criticas e prepara ambiente para producao.

2. **Soft delete e restore**
- Impacto: preserva historico, reduz risco de perda irreversivel.

3. **Bulk create de usuarios (admin)**
- Impacto: aumenta throughput operacional para cadastros em lote.

4. **Auditoria de eventos**
- Impacto: rastreabilidade para governanca e suporte.

5. **Metricas de API**
- Impacto: visibilidade de saude operacional e base para observabilidade.

## Setup e Execucao

### Pre-requisitos
- Node.js `>= 18`

### Instalacao
```bash
git clone https://github.com/matheussiqueira-dev/fake-api-js-async.git
cd fake-api-js-async
npm install
```

### Executar
```bash
npm run start
```

Servidor:
- `http://127.0.0.1:3333`
- OpenAPI: `http://127.0.0.1:3333/api/v1/openapi.json`

Usuarios padrao (ambiente local):
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
|       |-- auth-service.js
|       |-- audit-service.js
|       `-- user-service.js
|-- public/
|-- tests/
|   |-- api-v1.test.js
|   |-- auth-service.test.js
|   `-- user-service.test.js
`-- README.md
```

## Boas Praticas e Padroes Aplicados

- SRP e separacao de responsabilidades por modulo.
- Composicao de dependencias no bootstrap.
- Fail-fast em validacoes e tratamento de erro previsivel.
- Contrato de resposta consistente para clientes.
- Testes unitarios e integracao cobrindo seguranca e regras principais.

## Melhorias Futuras

- Persistencia em banco (PostgreSQL) com repositorios e migracoes.
- Refresh tokens + revogacao de sessao.
- Logs estruturados com correlation id em stack observavel (ELK/OpenSearch).
- Exportadores Prometheus/OpenTelemetry.
- Circuit breaker e retry policy para integracoes externas.
- Pipeline CI/CD com quality gates e SAST.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/