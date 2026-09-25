# SENTINEL

SENTINEL é a memória operacional dos meus projetos. Ele registra o que um projeto é, por que existe, como nasceu, quem participou, quais decisões foram tomadas e o que aconteceu com ele.

- **1.0 — Foundation** (`v1.0.0`): autenticação, design system, formulário de nascimento do projeto, overview, Rubrica, timeline.
- **2.0 — Project Intelligence**: GitHub real (conexão, sincronização, atividade), milestones, progresso por fontes reais, timeline com origens, Rubrica 2.0 (Markdown, tags, busca, histórico), busca global ⌘K e ferramentas com categorias e custo.

Produção: https://sentinel-ashy-alpha.vercel.app

## Stack

- Next.js 16 (App Router, Server Actions, `proxy.ts`) + TypeScript
- PostgreSQL (Neon em produção) via Drizzle ORM + `postgres.js`
- Tailwind CSS 4 (tokens em `src/app/globals.css`), Motion, Lucide
- Zod para validação. As mesmas regras rodam no cliente e no servidor.

## Configuração

```bash
cp .env.example .env        # preencha DATABASE_URL e SENTINEL_ADMIN_PASSWORD
npm install
npm run db:migrate          # aplica as migrations em drizzle/
npm run db:seed             # opcional: cria o admin agora (também é criado no primeiro login)
npm run dev
```

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão *pooled* do Neon (`?sslmode=require`). |
| `SENTINEL_ADMIN_EMAIL` | E-mail do administrador inicial (`marcus@sentinel.com`). |
| `SENTINEL_ADMIN_PASSWORD` | Senha inicial. Mínimo de 12 caracteres. Fica só em env/secret, nunca no código. |
| `GITHUB_TOKEN` | Opcional. Token *fine-grained* somente leitura (Contents, Metadata, Pull requests, Issues). Necessário para repositórios privados e para listar seus repositórios no seletor; aumenta o limite de 60 para 5.000 requisições/hora. |

O administrador só é **criado** a partir das variáveis de ambiente, nunca atualizado. Depois do primeiro login, trocar a variável não altera a senha já cadastrada.

## Scripts

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run db:generate` (gera uma nova migration a partir do schema)

`npm test` roda dois projetos Vitest: **unit** (domínio puro) e **integration** (`*.int.test.ts`, contra o PostgreSQL de `DATABASE_URL` — autorização entre usuários, busca global, sincronização idempotente). Os testes de integração criam usuários isolados e limpam tudo ao final.

## Banco e migrations

- Migrations em `drizzle/`, geradas com `npm run db:generate` e aplicadas com `npm run db:migrate`.
- Na Vercel, o script `vercel-build` aplica as migrations antes do `next build`. Produção usa o branch `main` do Neon e previews usam o branch `preview`, então um preview nunca migra o banco de produção.
- A migration `0001_intelligence` cria a extensão `unaccent`, usada na busca sem acentos.

## Deploy

Projeto Vercel `sentinel`, ligado a `marcusvalerio/SENTINEL`. `main` vai para produção e os branches geram previews protegidos por Vercel Authentication. Variáveis (tipo *sensitive*): `DATABASE_URL` (produção e preview apontam para branches diferentes do Neon), `SENTINEL_ADMIN_EMAIL`, `SENTINEL_ADMIN_PASSWORD` e, opcionalmente, `GITHUB_TOKEN`.

## Arquitetura

```
src/
  domain/            vocabulário e regras puras (status, tipos, validação do formulário, parser do GitHub)
  server/
    db/              schema Drizzle + client
    auth/            senhas (scrypt), sessões, admin inicial, rate limit, actions de login/logout
    projects/        queries (sempre filtradas por dono), actions, cálculo de progresso
    notes/ tools/ timeline/ milestones/  actions de cada módulo
    github/          cliente REST (erros tipados), sync idempotente, actions de conexão
    search/          busca global (sempre filtrada por owner_id)
  components/
    ui/              design system (Button, Input, Modal, Toast, Dropdown, CommandMenu, Stepper…)
    project-form/    wizard de criação/edição (6 etapas + revisão, autosave)
    project/         seções da página do projeto
  app/
    (auth)/login     login
    (app)/           shell autenticado: dashboard e /projects/[id]/*
    (focus)/         modo foco sem navegação: /projects/new e /projects/[id]/edit
```

## Decisões importantes

- **Autorização no servidor.** O `proxy.ts` só redireciona de forma otimista quem não tem cookie. Toda página, query e action chama `requireUser()`, e toda consulta filtra por `owner_id`. Um id de projeto sozinho nunca dá acesso.
- **Sessões no banco.** O cookie (`__Host-` em produção, `HttpOnly`, `SameSite=Lax`) guarda um token aleatório. O banco guarda só o SHA-256 dele. A expiração é deslizante, de 30 dias. O login tem proteção contra enumeração de usuários (hash dummy) e um rate limit em memória.
- **Senhas com scrypt** (`node:crypto`, N=2¹⁵). Os parâmetros ficam junto com o hash, então dá para endurecer depois sem perder as senhas existentes.
- **Progresso ≠ atividade.** O progresso vem das funcionalidades (ponderado por prioridade: essencial 3, importante 2, desejável 1; em andamento vale 35%) ou é definido manualmente. O GitHub é só fonte de *atividade* e nunca altera o percentual. `progress_source` já está pronto para receber milestones e tarefas.
- **Um repositório por projeto.** `project_github_connections.project_id` é único. A conexão é verificada na API do GitHub quando possível. Se o GitHub não responder, ela é salva como "não verificada".
- **Rubrica = diário.** Registros de tipo *Decisão* também entram automaticamente na timeline.
- **Timeline automática.** Criação, mudança de status, alteração de escopo e conexão ou desconexão do GitHub geram eventos de `source = system`. Esses eventos não podem ser apagados. Eventos manuais podem.
- **Autosave.** O wizard espelha cada mudança no `localStorage` e grava um rascunho no servidor (`project_drafts`) após 900 ms sem digitação. Rascunhos aparecem no dashboard em "Em registro" e podem ser retomados pelo link `?draft=`.
- **Dinheiro em centavos** (`bigint`), com moeda por projeto (padrão BRL).
- **Observações:** a etapa é obrigatória no fluxo, porque não pode ser pulada antes da revisão. O conteúdo é opcional. Os campos obrigatórios são só nome, tipo e objetivo principal.
- **Tema escuro único**, construído sobre a paleta Aswad / Rurikon / Deep Cobalt / Jam Session, com Wine Yellow e Antique Gold usados com parcimônia.

### Decisões da 2.0

- **Progresso ≠ atividade.** O progresso tem três fontes: funcionalidades, milestones (média ponderada por prioridade, cancelados ignorados, cada milestone medido pelas funcionalidades vinculadas ou pelo próprio status) e manual. Atividade do GitHub (commits, PRs, issues, releases) nunca altera o percentual, e o cabeçalho do projeto mostra os dois lado a lado com rótulos distintos.
- **GitHub em uma tabela.** `github_activity` guarda os quatro tipos de atividade, com unicidade em `(project_id, kind, external_id)`, então a sincronização é um *upsert* idempotente. Branches e contribuidores ficam como *snapshot* JSON na conexão.
- **Nunca misturar repositórios.** Trocar ou desconectar o repositório apaga a atividade anterior. Se o nome conectado passar a apontar para outro `repository_id`, a sincronização é recusada.
- **Sincronização com trava.** Uma sincronização "reivindica" a conexão (`sync_status = syncing`), o que impede execuções paralelas; após 2 minutos a trava expira. O mesmo `syncProjectRepository()` pode ser chamado por um cron no futuro.
- **Timeline composta na leitura.** Eventos do projeto têm `origin` (projeto, Rubrica, milestone, desenvolvimento). A atividade do GitHub entra na timeline no momento da leitura, sem cópia: commits são agrupados por dia, e PRs integrados e issues fechadas geram entradas próprias.
- **Rubrica 2.0.** A Rubrica usa um dialeto Markdown pequeno, renderizado como elementos React (nunca HTML injetado; links só `http`, `https` e `mailto`). Tags vêm do campo de tags e das `#hashtags` no texto. Cada edição guarda a versão anterior em `project_note_revisions`. Registros de Decisão, Problema e Insight também entram na timeline.
- **Busca global.** `GET /api/search` é um route handler, e não uma server action, para permitir requisições paralelas e canceláveis com `AbortController`. A busca usa `unaccent` com `ILIKE` e wildcards escapados, e agrupa resultados por tipo com contagem total.

## Próximos passos (a arquitetura já prevê)

Sincronização automática (cron chamando `syncProjectRepository`), tarefas, documentação, tecnologia/stack, ledger financeiro, gestão de equipe na interface, anexos e menções na Rubrica, e múltiplos usuários na interface.
