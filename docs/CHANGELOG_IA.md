# Afterpay J27 — Changelog de IA

> Para o estado atual, consulte também [`ATUALIZACAO_2026-11-15.md`](ATUALIZACAO_2026-11-15.md).

## 2026-11-15 — Modernização visual, catálogo de produtos e estabilização

### Objetivo

Modernizar o Afterpay J27 preservando a arquitetura Next.js/Supabase, adicionar o catálogo de produtos integrado aos pedidos e corrigir pontos de autorização e inicialização identificados na revisão do ZIP.

### Principais alterações

- Interface SaaS com azul-marinho, azul elétrico e violeta; sidebar desktop e navegação mobile.
- Novo módulo Produtos com cadastro, edição, exclusão, ativação/desativação, SKU, URL de imagem, custo, preço, lucro unitário e margem.
- Seleção de produto nos formulários de pedido, tanto para administradores quanto para afiliados.
- Snapshot de nome, custo e preço no pedido; os campos financeiros existentes continuam preservando o histórico.
- Migration incremental `202611150001_produtos_pedidos_financeiro.sql` e cópia `migration_afterpay_j27.sql`.
- RLS de produtos e correção das políticas administrativas com `WITH CHECK` incompleto.
- Policy de notificações mais restrita.
- `PUSH_WEBHOOK_SECRET` obrigatório na Edge Function de push.
- Correção de `fetchMyProfile()` para retornar `null` quando o profile ainda não existe.
- Manifest PWA, novos ícones e dependências fixadas às versões do lockfile.
- Dashboard com filtros de período, separação entre faturamento previsto/recebido e resultado estimado após despesas registradas.

### Validação

- Parser TypeScript: JSX/JavaScript sem erros de sintaxe detectados.
- `npm ci`: não concluído por indisponibilidade de DNS para `registry.npmjs.org`; modo offline falhou por pacote ausente no cache.
- `next build`, testes remotos de Supabase, RLS e Push: não executados; exigem dependências/credenciais/ambiente externo.

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
