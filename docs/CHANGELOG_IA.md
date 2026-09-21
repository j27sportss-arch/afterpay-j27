# Afterpay J27 — Changelog de IA

## 2026-09-21 — Fase 0: Auditoria e Documentação

### Objetivo

Realizar auditoria somente leitura do repositório Afterpay J27 e produzir documentação oficial para futuras IAs e desenvolvedores.

### Arquivos analisados

Todo o conteúdo de código/documentação do arquivo entregue foi inspecionado, incluindo:

- `package.json`
- `package-lock.json`
- `README.md`
- `.env.example`
- `env.example`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `jsconfig.json`
- `src/app/AppInner.jsx`
- `src/app/layout.jsx`
- `src/app/page.jsx`
- `src/app/globals.css`
- `src/lib/db.js`
- `public/sw.js`
- ícones em `public/`
- `supabase/schema.sql`
- `supabase/migrations/202609060001_push_notifications.sql`
- `supabase/functions/create-affiliate/index.ts`
- `supabase/functions/push-notification/index.ts`

### Arquivos criados

```text
/docs/CONTEXTO_IA.md
/docs/ARQUITETURA.md
/docs/BANCO.md
/docs/REGRAS_NEGOCIO.md
/docs/INTEGRACOES.md
/docs/SEGURANCA.md
/docs/ROADMAP.md
/docs/CHANGELOG_IA.md
```

### Principais descobertas

1. O projeto possui arquitetura Next.js + React + Supabase.
2. O banco foi desenhado para multiempresa.
3. RLS está presente nas tabelas principais.
4. Admin e afiliado possuem fluxos distintos.
5. Existe estrutura de notificações persistidas + Realtime.
6. Existe cadeia de Web Push no código.
7. Não foi encontrado `manifest.json`.
8. Não foi encontrado middleware Next.js.
9. Não foram encontradas API Routes/Route Handlers.
10. Não foi possível verificar o ambiente remoto.
11. `AppInner.jsx` referencia duas funções ausentes em `db.js`.
12. A policy de update de notificações é mais permissiva do que seu comentário sugere.
13. A proteção da Edge Function de push depende de secret opcional.

### Decisões arquiteturais registradas

- O código atual é a evidência principal quando houver divergência.
- Funcionalidades futuras não devem ser tratadas como existentes.
- Estado remoto não confirmado deve ser marcado como não verificável.
- Nenhuma alteração de código, banco, RLS, Auth, Web Push ou infraestrutura foi feita nesta fase.

### Próximos passos

Aguardar instruções.

A próxima fase recomendada é estabilização/validação do sistema atual antes da implementação de novas funcionalidades.
