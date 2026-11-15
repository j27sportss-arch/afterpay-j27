# Afterpay J27 — Contexto Oficial para IA

> **Nota de atualização — 15/11/2026:** este documento contém histórico de auditoria de 21/09/2026. Para o estado vigente do ZIP atualizado, consulte [`ATUALIZACAO_2026-11-15.md`](ATUALIZACAO_2026-11-15.md), que prevalece em caso de divergência.

**Versão:** auditoria Fase 0  
**Data da auditoria:** 2026-09-21  
**Escopo:** auditoria estática do repositório entregue no arquivo `afterpay-j27-main (1).zip`.

> Este documento descreve o que foi encontrado no código. O estado real de um projeto Supabase/Vercel/GitHub publicado não pôde ser confirmado porque o arquivo entregue não contém o estado remoto desses serviços.

## 1. O que é o Afterpay J27

O repositório implementa uma aplicação web de gestão de vendas/operação com suporte a empresas isoladas, administradores e afiliados. O README descreve o produto como uma versão multiempresa/SaaS.

O fluxo atual identificado é:

- administrador cria uma conta com e-mail e senha;
- a conta é vinculada a uma empresa/operação;
- administrador gerencia pedidos, afiliados e despesas;
- afiliados entram por empresa + nome + PIN;
- afiliados registram vendas;
- pedidos possuem estados operacionais e financeiros;
- notificações são geradas no banco para eventos de pedidos;
- existe uma cadeia de Web Push parcialmente implementada no repositório.

## 2. Stack realmente encontrada

- Next.js 14.2.5
- React 18.3.1
- React DOM 18.3.1
- Supabase JS 2.115.0 no lockfile
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime
- Supabase Edge Functions
- Tailwind CSS 3.4.19 no lockfile
- lucide-react 1.41.0 no lockfile
- Web Push via `web-push` na Edge Function
- Service Worker em `public/sw.js`
- Vercel é descrita no README como destino de deploy, mas não há configuração remota verificável no arquivo entregue.

## 3. Estrutura atual

```text
/
├── public/
│   ├── icons/
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── AppInner.jsx
│   │   ├── globals.css
│   │   ├── icon.svg
│   │   ├── layout.jsx
│   │   └── page.jsx
│   └── lib/
│       └── db.js
├── supabase/
│   ├── functions/
│   │   ├── create-affiliate/
│   │   └── push-notification/
│   ├── migrations/
│   │   └── 202609060001_push_notifications.sql
│   └── schema.sql
├── package.json
├── package-lock.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

Não foi encontrado `middleware.js`, `middleware.ts`, `manifest.json`, `vercel.json`, diretório `.github`, API Routes em `src/app/api`, ou outras rotas de backend Next.js.

## 4. Funcionalidades encontradas

### Implementado no código

- autenticação de administrador por Supabase Auth;
- logout;
- cadastro de empresa + administrador via RPC;
- seleção pública de empresa para fluxo de afiliado;
- seleção pública de afiliado ativo;
- login de afiliado por PIN convertido internamente em credencial do Supabase Auth;
- dashboard operacional;
- cadastro/edição/exclusão de pedidos para administrador;
- registro de pedido pelo afiliado;
- gerenciamento de afiliados;
- desativação de afiliado;
- despesas por dia, separadas em tráfego e outras;
- cálculo de faturamento, custo, lucro e indicadores operacionais no frontend;
- notificações persistidas no banco;
- Realtime para pedidos, afiliados, despesas e notificações;
- Service Worker;
- código de assinatura Web Push;
- Edge Function de criação de afiliado;
- Edge Function de envio de Web Push.

### Parcial

- cadastro/recuperação de empresa após autenticação: o `AppInner.jsx` importa `completarCadastroEmpresa` e `tentarCompletarCadastroAutomatico`, mas essas funções não existem em `src/lib/db.js`. Portanto, o fluxo referenciado está incompleto e constitui um problema de integração entre frontend e camada de dados.
- Web Push: existe código frontend, tabela, migration e Edge Function, mas não é possível confirmar pelo repositório se os secrets, webhook, deploy e subscriptions reais estão configurados.
- PWA: há Service Worker e ícones, mas não foi encontrado `manifest.json`; portanto, a implementação não pode ser considerada um PWA completo com base apenas no repositório.
- recuperação de senha: não foi encontrada implementação de fluxo de recuperação de senha no frontend.
- atualização de perfil/usuários: há policy para update de profiles, mas não há interface identificada para administração geral de usuários.

### Problemas

1. `AppInner.jsx` importa duas funções de `../lib/db.js` que não existem:
   - `completarCadastroEmpresa`
   - `tentarCompletarCadastroAutomatico`

   Isso deve ser tratado como incompatibilidade atual entre arquivos e pode impedir o build/execução correta do módulo.

2. A policy `notificacoes_update_own` permite update para qualquer usuário autenticado da mesma empresa por causa do `OR empresa_id = public.my_empresa_id()`. Isso é mais amplo do que o comentário que diz que cada usuário marca as próprias notificações.

3. A Edge Function `push-notification` torna o `PUSH_WEBHOOK_SECRET` opcional. Quando esse secret não existe, não há a checagem adicional do header `x-webhook-secret`. Como o README recomenda deploy com `--no-verify-jwt`, a proteção do endpoint depende da existência e configuração desse secret.

4. Não é possível confirmar a configuração/deploy real do Supabase, Vercel, Database Webhook ou secrets somente pelo ZIP.

## 5. Planejado/documentado

O README e a visão fornecida para esta auditoria apontam para uma evolução para SaaS multiempresa, com:

- plataforma → empresas → usuários → dados da empresa;
- proprietário da plataforma controlando empresas, ativação/suspensão, licença, plano e vencimento;
- administrador da empresa controlando usuários, pedidos, clientes, produtos, fornecedores, financeiro e operação;
- fornecedor inteligente;
- cálculo financeiro ampliado;
- integrações futuras com Meta Ads, WhatsApp e Kommo;
- fornecedores como Shopee, Mercado Livre e outros;
- análises de produtos, lucro e anúncios;
- alertas, ranking, recomendações e IA analista.

Esses itens são tratados como planejamento futuro, não como funcionalidades atuais.

## Estado atual

### Implementado

- Next.js/React com interface operacional.
- Supabase JS no frontend.
- Supabase Auth.
- Banco multiempresa modelado.
- RLS nas tabelas principais.
- Pedidos.
- Afiliados.
- Despesas.
- Notificações.
- Realtime.
- Service Worker.
- Estrutura de Web Push.
- Edge Function para criação de afiliado.
- Edge Function para envio de push.

### Parcial

- Fluxo de conclusão automática de cadastro da empresa.
- Web Push end-to-end.
- PWA.
- Administração de usuários.
- Recuperação de senha.

### Problemas

- Imports inexistentes em `AppInner.jsx`.
- Policy de update de notificações excessivamente ampla.
- Proteção da Edge Function de push depende de secret opcional.
- Estado remoto de Supabase/Vercel/GitHub não verificável no ZIP.

### Planejado

- SaaS de plataforma com controle de empresas/licenças/planos.
- Gestão ampliada de usuários.
- Clientes, produtos e fornecedores.
- Financeiro avançado.
- Fornecedor inteligente.
- Integrações de marketing.
- Inteligência analítica/IA.

## Regra para todas as próximas IAs

> **Antes de modificar qualquer código do Afterpay J27, a IA responsável deve ler os arquivos relevantes dentro de `/docs`.**
>
> **Os arquivos `/docs` representam a fonte oficial de contexto do projeto.**
>
> **Caso o código atual contradiga a documentação, a IA deve considerar o código como evidência e solicitar/recomendar atualização da documentação antes de assumir uma nova regra.**
