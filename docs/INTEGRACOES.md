# Afterpay J27 — Integrações

**Data:** 2026-09-21

> Estado baseado somente no repositório. Integrações externas publicadas não foram testadas.

## 1. Supabase Auth

**Estado: FUNCIONANDO NO CÓDIGO / CONFIGURAÇÃO REMOTA NÃO CONFIRMADA**

Finalidade:
- autenticação de admins;
- autenticação de afiliados;
- sessão;
- logout.

Arquivos:
- `src/lib/db.js`
- `src/app/AppInner.jsx`
- `supabase/functions/create-affiliate/index.ts`

Variáveis:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Supabase PostgreSQL / PostgREST

**Estado: IMPLEMENTADO**

Finalidade:
- persistência das entidades;
- RLS;
- RPCs;
- triggers.

Arquivo principal:
- `supabase/schema.sql`

## 3. Supabase Realtime

**Estado: IMPLEMENTADO NO CÓDIGO**

Usado para:
- pedidos;
- afiliados;
- despesas;
- notificações.

Arquivos:
- `src/lib/db.js`
- `supabase/schema.sql`

A configuração real do projeto remoto não foi verificada.

## 4. Edge Function `create-affiliate`

**Estado: IMPLEMENTADO**

Finalidade:
- criar usuário Auth para afiliado;
- criar registro de afiliado;
- criar profile.

Autenticação:
- token Bearer do usuário atual;
- validação de role `admin` pelo profile.

Secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Endpoint lógico usado pelo frontend:

```text
/functions/v1/create-affiliate
```

O host real depende do `SUPABASE_URL` configurado.

## 5. Edge Function `push-notification`

**Estado: PARCIAL / DEPENDENTE DE CONFIGURAÇÃO**

Finalidade:
- receber evento de webhook;
- buscar subscriptions;
- enviar Web Push.

Secrets:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PUSH_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

O código aceita POST e, se `PUSH_WEBHOOK_SECRET` estiver configurado, valida `x-webhook-secret`.

## 6. Web Push

**Estado: PARCIAL**

Frontend:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

Backend:
- `web-push`.

Persistência:
- `push_subscriptions`.

Service Worker:
- `public/sw.js`.

Não foi possível confirmar:
- secret real;
- subscription real;
- webhook real;
- deploy da Edge Function;
- entrega efetiva.

## 7. Database Webhook

**Estado: PLANEJADO/DOCUMENTADO, NÃO CONFIRMADO**

O README instrui a criar webhook para `public.notificacoes` em INSERT.

Não existe configuração do webhook no repositório.

## 8. Vercel

**Estado: PLANEJADO/DOCUMENTADO**

O README descreve Vercel como plataforma de deploy.

Não há evidência de projeto Vercel conectado ou deploy ativo no ZIP.

## 9. Google Fonts

**Estado: USADO NO FRONTEND**

`AppInner.jsx` importa Manrope e IBM Plex Mono por CSS externo.

Isso cria uma dependência de rede para carregamento das fontes.

## 10. Integrações futuras

### Meta Ads
**NÃO IMPLEMENTADO.**

### WhatsApp
**NÃO IMPLEMENTADO.**

### Kommo
**NÃO IMPLEMENTADO.**

### Shopee
**NÃO IMPLEMENTADO.**

### Mercado Livre
**NÃO IMPLEMENTADO.**

Não há endpoints ou credenciais dessas integrações no código analisado.

Qualquer automação de checkout de terceiros deverá ser pesquisada e validada antes de ser tratada como possível.

## 11. Resumo

| Integração | Estado |
|---|---|
| Supabase Auth | FUNCIONANDO NO CÓDIGO |
| Supabase DB | IMPLEMENTADO |
| Supabase Realtime | IMPLEMENTADO NO CÓDIGO |
| create-affiliate | IMPLEMENTADO |
| push-notification | PARCIAL |
| Web Push | PARCIAL |
| Database Webhook | NÃO CONFIRMADO |
| Vercel | NÃO CONFIRMADO |
| Meta Ads | NÃO IMPLEMENTADO |
| WhatsApp | NÃO IMPLEMENTADO |
| Kommo | NÃO IMPLEMENTADO |
| Shopee | NÃO IMPLEMENTADO |
| Mercado Livre | NÃO IMPLEMENTADO |
