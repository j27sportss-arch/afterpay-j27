# Afterpay J27 — Auditoria de Segurança

> **Nota de atualização — 15/11/2026:** este documento contém histórico de auditoria de 21/09/2026. Para o estado vigente do ZIP atualizado, consulte [`ATUALIZACAO_2026-11-15.md`](ATUALIZACAO_2026-11-15.md), que prevalece em caso de divergência.

**Data:** 2026-09-21  
**Escopo:** análise estática. Nenhuma correção foi aplicada.

## 1. Autenticação

### Supabase Auth

**Estado: IMPLEMENTADO**

O app usa:

- `signUp`;
- `signInWithPassword`;
- `getSession`;
- `onAuthStateChange`;
- `signOut`.

Administrador:
- e-mail + senha.

Afiliado:
- e-mail sintético + PIN usado como senha do Auth.

### Recuperação de senha

**Não identificado no projeto atual.**

Não foi encontrado fluxo de `resetPasswordForEmail` ou interface correspondente.

### Proteção de rotas

Não existe middleware Next.js.

A proteção ocorre no frontend e no banco:

- frontend escolhe tela pelo profile/role;
- RLS protege as tabelas.

A ausência de middleware significa que a segurança real dos dados depende fortemente do RLS e das regras server-side.

## 2. Autorização

### Admin

O banco verifica `role = admin` através de `is_admin()`.

### Afiliado

O banco usa `my_affiliate_id()` e políticas específicas.

### Multiempresa

Há `empresa_id` nas principais tabelas e policies baseadas em `my_empresa_id()`.

**Estado: BASE MULTIEMPRESA IMPLEMENTADA.**

### Risco de notificações

A policy:

```sql
create policy notificacoes_update_own
...
using (usuario_id = auth.uid() or empresa_id = public.my_empresa_id())
```

permite a qualquer usuário da empresa atualizar notificações da empresa.

**Classificação: 🟠 ALTO**

Impacto:
- alteração indevida de `lida`;
- potencial alteração de título, mensagem, tipo, usuário e pedido, dependendo do update enviado pelo cliente.

## 3. Banco / RLS

RLS está habilitado em:

- empresas;
- profiles;
- afiliados;
- pedidos;
- despesas;
- notificacoes;
- push_subscriptions.

A estrutura de isolamento é consistente em grande parte do schema.

### Risco de integridade empresa/afiliado

`pedidos.afiliado_id` referencia `afiliados.id`, mas o banco não possui uma FK composta que force `pedidos.empresa_id` a ser igual à `afiliados.empresa_id`.

As policies reduzem o risco para operações autenticadas, mas uma constraint de integridade mais forte não foi encontrada.

**Classificação: 🟡 MÉDIO**

## 4. Funções públicas

`empresas_publico()` e `afiliados_login_publico()` são `security definer` e executáveis por `anon`.

O retorno é limitado a id + nome, mas permite enumeração das empresas e afiliados ativos.

**Classificação: 🟡 MÉDIO**

Isso parece ter sido criado deliberadamente para o fluxo de login de afiliados, mas aumenta a superfície de enumeração.

## 5. Edge Function `create-affiliate`

Pontos positivos:

- usa service role somente na Edge Function;
- valida token;
- busca profile;
- exige role admin;
- vincula afiliado à empresa do admin;
- apaga usuário Auth se a criação do registro falhar;
- não armazena o PIN em tabela da aplicação.

Risco:

- CORS usa `Access-Control-Allow-Origin: *`;
- a segurança depende da validação server-side existente.

**Classificação CORS: 🟢/🟡 BAIXO a MÉDIO**, dependendo da política operacional desejada.

## 6. Edge Function `push-notification`

Ponto crítico:

```text
PUSH_WEBHOOK_SECRET é opcional
```

Se o secret não existir, a função não exige `x-webhook-secret`.

O README recomenda deploy sem verificação JWT porque o chamador é o Database Webhook.

Logo, se o secret não estiver configurado no ambiente real, o endpoint poderá aceitar POSTs não autenticados.

**Classificação: 🔴 CRÍTICO se o secret estiver ausente em produção.**

Como o ZIP não permite verificar secrets/deploy, o estado real deve ser confirmado antes de concluir que esse risco está ativo.

## 7. Secrets

Foram identificadas referências a:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `VAPID_PRIVATE_KEY`;
- `VAPID_PUBLIC_KEY`;
- `PUSH_WEBHOOK_SECRET`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

O código não contém os valores reais desses secrets no arquivo entregue.

A service role é usada em Edge Functions, não no frontend.

A chave VAPID privada é lida somente na Edge Function.

Isso é adequado em princípio.

## 8. Frontend

Não foi encontrado:

- `dangerouslySetInnerHTML`;
- `innerHTML`;
- armazenamento de token manual em localStorage;
- código evidente de XSS por HTML arbitrário.

O Supabase gerencia a sessão.

## 9. APIs / validação

A Edge Function de criação de afiliado valida:

- nome;
- PIN;
- sessão;
- role admin.

A função de push valida:
- método POST;
- payload mínimo;
- secret se configurado.

Não há rate limiting próprio identificado.

**Classificação: 🟡 MÉDIO**

## 10. Dependências

O package.json usa algumas dependências como `latest`:

- `@supabase/supabase-js`;
- `lucide-react`;
- `autoprefixer`;
- `postcss`.

O lockfile fixa versões instaladas, mas futuras instalações podem receber versões diferentes caso o lockfile seja substituído/ignorado.

**Classificação: 🟡 MÉDIO**

## 11. Infraestrutura

HTTPS, headers de segurança, CORS global da aplicação, configurações reais da Vercel e políticas reais do projeto Supabase não podem ser confirmados pelo ZIP.

**Classificação: ⚪ Não identificado no projeto atual.**

## 12. Problema de build/import

`AppInner.jsx` importa duas funções que não existem em `db.js`.

**Classificação: 🔴 CRÍTICO para funcionamento do build/aplicação.**

Não foi feita nenhuma correção nesta auditoria.

## 13. Matriz de riscos

| Risco | Classificação | Evidência |
|---|---|---|
| Imports inexistentes | 🔴 CRÍTICO | AppInner ↔ db.js |
| Push sem secret configurado | 🔴 CRÍTICO condicional | Edge Function |
| Update amplo de notificações | 🟠 ALTO | RLS policy |
| Integridade empresa/afiliado sem FK composta | 🟡 MÉDIO | schema |
| Enumeração pública de empresas/afiliados | 🟡 MÉDIO | RPCs públicas |
| Falta de rate limiting próprio | 🟡 MÉDIO | Edge Functions |
| Dependências `latest` no package.json | 🟡 MÉDIO | package.json |
| PWA sem manifest identificado | 🟢 BAIXO | estrutura |
| Secrets reais no código | 🟢 BAIXO | nenhum valor encontrado |

## 14. Regra desta auditoria

Nenhuma correção de segurança foi aplicada. Esta documentação apenas registra riscos encontrados.
