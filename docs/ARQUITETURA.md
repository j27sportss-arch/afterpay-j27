# Afterpay J27 — Arquitetura Real

> **Nota de atualização — 15/11/2026:** este documento contém histórico de auditoria de 21/09/2026. Para o estado vigente do ZIP atualizado, consulte [`ATUALIZACAO_2026-11-15.md`](ATUALIZACAO_2026-11-15.md), que prevalece em caso de divergência.

**Data:** 2026-09-21

## 1. Visão

A arquitetura encontrada é uma aplicação Next.js/React no frontend, conectada diretamente ao Supabase JS para Auth e operações no PostgreSQL. Parte das operações privilegiadas é realizada por Edge Functions.

```text
Navegador
   │
   ├── Next.js / React
   │      └── src/app/AppInner.jsx
   │
   ├── Supabase JS
   │      ├── Auth
   │      ├── PostgREST / PostgreSQL
   │      └── Realtime
   │
   └── Service Worker
          └── Web Push

Supabase
   ├── Auth
   ├── PostgreSQL
   │    ├── empresas
   │    ├── profiles
   │    ├── afiliados
   │    ├── pedidos
   │    ├── despesas
   │    ├── notificacoes
   │    └── push_subscriptions
   │
   └── Edge Functions
        ├── create-affiliate
        └── push-notification
```

## 2. Frontend

O ponto de entrada é `src/app/page.jsx`, que renderiza `AppInner`.

`AppInner.jsx` concentra praticamente toda a interface e lógica de apresentação, incluindo:

- autenticação;
- dashboard;
- pedidos;
- afiliados;
- despesas;
- notificações;
- comportamento de administrador;
- comportamento de afiliado;
- registro do Service Worker.

A camada de acesso ao Supabase está em `src/lib/db.js`.

Não há uma arquitetura de componentes distribuída em vários arquivos: grande parte da UI está concentrada em `AppInner.jsx`.

## 3. Next.js

Encontrado:

- Next.js 14.2.5;
- App Router;
- `src/app/layout.jsx`;
- `src/app/page.jsx`;
- `next.config.js` com `reactStrictMode: true`.

Não encontrado:

- middleware;
- API Routes;
- Route Handlers;
- Server Actions;
- configuração específica de Vercel no repositório.

## 4. Supabase

O Supabase é usado para:

- autenticação;
- persistência;
- autorização via RLS;
- Realtime;
- Edge Functions.

O frontend usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 5. PostgreSQL

O banco contém tabelas para empresas, perfis, afiliados, pedidos, despesas, notificações e subscriptions de push.

Há funções SQL auxiliares para descobrir a empresa, papel e afiliado do usuário autenticado.

Há triggers para:

- atualizar `despesas.atualizado_em`;
- gerar notificações quando pedidos são criados;
- gerar notificações quando pedidos passam para `Entregue` ou `Pago`.

## 6. Auth

Administrador:

```text
signUp(email, password)
        ↓
criar_empresa_e_admin()
        ↓
empresa + profile(role=admin)
```

Afiliado:

```text
empresa pública
      ↓
afiliado ativo público
      ↓
PIN
      ↓
signInWithPassword()
      ↓
profile(role=affiliate)
```

A Edge Function `create-affiliate` cria um usuário real no Supabase Auth com e-mail sintético e senha igual ao PIN fornecido. O PIN não é salvo em texto em uma tabela da aplicação.

## 7. Realtime

`src/lib/db.js` cria canais Supabase Realtime para:

- pedidos;
- afiliados;
- despesas;
- notificações.

O banco também adiciona pedidos, afiliados, despesas e notificações à publicação `supabase_realtime`.

## 8. Notificações

O fluxo encontrado é:

```text
Pedido
  ↓
PostgreSQL trigger
  ↓
public.notificacoes
  ├── Supabase Realtime → sino no frontend
  └── Database Webhook
          ↓
    Edge Function push-notification
          ↓
       web-push
          ↓
   Service Worker / navegador
```

A existência/configuração real do Database Webhook não pode ser confirmada no ZIP.

## 9. Web Push

Frontend:

- registra/aguarda Service Worker;
- verifica Notification, Service Worker e PushManager;
- solicita permissão;
- cria subscription;
- grava subscription em `push_subscriptions`.

Backend:

- Edge Function recebe evento;
- consulta subscriptions da empresa;
- envia Web Push;
- remove subscriptions que retornam 404/410.

## 10. PWA

Há Service Worker e ícones, mas não foi encontrado `manifest.json`.

Portanto:

**Estado: PARCIAL.**

Não é possível afirmar, pelo repositório, que a instalação PWA esteja completa.

## 11. Infraestrutura

O README documenta Vercel como destino previsto e fornece variáveis de ambiente para o frontend.

Não há arquivo `vercel.json` nem evidência de configuração de um projeto Vercel real.

## 12. Principais lacunas arquiteturais

- inexistência das duas funções importadas pelo frontend;
- concentração excessiva de lógica/UI em `AppInner.jsx`;
- ausência de camada de domínio separada;
- ausência de middleware/Route Handlers;
- PWA incompleto no repositório;
- configuração remota não versionada/verificável;
- cadeia Web Push depende de configuração externa não presente no código.
