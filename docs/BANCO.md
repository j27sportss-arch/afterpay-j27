# Afterpay J27 — Inventário Real do Banco

**Fonte:** `supabase/schema.sql` e migration de Web Push.  
**Data:** 2026-09-21.

> Este documento descreve o schema versionado no repositório. Não confirma que o banco remoto atualmente publicado seja idêntico.

## 1. Tabelas

### `empresas`

Finalidade: representar cada operação/empresa.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| nome | text | NOT NULL |
| criado_em | timestamptz | NOT NULL, default now() |

FKs: referenciada por várias tabelas.

RLS: habilitado.

Policy de SELECT: usuário autenticado só pode ver empresa cujo `id = my_empresa_id()`.

### `profiles`

Finalidade: vincular usuário do Supabase a uma empresa e papel.

| Campo | Tipo | Regras |
|---|---|---|
| user_id | uuid | PK, FK `auth.users`, cascade |
| empresa_id | uuid | NOT NULL, FK `empresas`, cascade |
| role | text | CHECK `admin` ou `affiliate` |
| afiliado_id | uuid | UNIQUE, FK `afiliados`, set null |
| nome | text | opcional |
| criado_em | timestamptz | default now() |

RLS: habilitado.

SELECT: próprio usuário ou usuários da própria empresa.

UPDATE: administradores podem atualizar profiles da própria empresa.

Não há policy explícita de INSERT/DELETE para usuários autenticados.

### `afiliados`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| empresa_id | uuid | NOT NULL, FK `empresas`, cascade |
| nome | text | NOT NULL |
| auth_user_id | uuid | UNIQUE, FK `auth.users`, set null |
| ativo | boolean | default true |
| criado_em | timestamptz | default now() |

RLS: habilitado.

Admin: CRUD da própria empresa.

Afiliado: leitura do próprio registro por `auth_user_id`.

### `pedidos`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| empresa_id | uuid | NOT NULL, FK `empresas`, cascade |
| cliente | text | NOT NULL |
| data_pedido | date | NOT NULL, default current_date |
| previsao_entrega | date | opcional |
| custo | numeric(12,2) | NOT NULL, >= 0 |
| venda | numeric(12,2) | NOT NULL, >= 0 |
| status | text | Em Rota / Entregue / Não Pago / Pago / Frustrado |
| forma_pagamento | text | default Pendente |
| data_pagamento | date | opcional |
| afiliado_id | uuid | FK `afiliados`, set null |
| criado_em | timestamptz | default now() |

Índices:
- `pedidos_empresa_idx`
- `pedidos_data_idx`
- `pedidos_afiliado_idx`
- `pedidos_status_idx`

RLS: habilitado.

Admin: acesso completo na própria empresa.

Afiliado: leitura dos próprios pedidos e INSERT de pedidos vinculados ao próprio afiliado + própria empresa.

### `despesas`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| empresa_id | uuid | FK `empresas`, cascade |
| data | date | NOT NULL |
| trafego | numeric(12,2) | >= 0 |
| outras | numeric(12,2) | >= 0 |
| atualizado_em | timestamptz | default now() |

Unique: `(empresa_id, data)`.

Índice: `despesas_empresa_idx`.

RLS: apenas admin da própria empresa.

### `notificacoes`

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| empresa_id | uuid | FK `empresas`, cascade |
| usuario_id | uuid | FK `auth.users`, cascade, opcional |
| tipo | text | NOT NULL |
| titulo | text | NOT NULL |
| mensagem | text | NOT NULL |
| pedido_id | uuid | FK `pedidos`, set null |
| lida | boolean | default false |
| criado_em | timestamptz | default now() |

Índices:
- `notificacoes_empresa_idx`
- `notificacoes_usuario_idx`

RLS: habilitado.

### `push_subscriptions`

Adicionada no schema e na migration de 2026-09-06.

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK `auth.users`, cascade |
| empresa_id | uuid | NOT NULL, FK `empresas`, cascade |
| endpoint | text | NOT NULL, UNIQUE |
| p256dh | text | NOT NULL |
| auth | text | NOT NULL |
| user_agent | text | opcional |
| criado_em | timestamptz | default now() |
| atualizado_em | timestamptz | default now() |

Índices:
- `push_subscriptions_user_idx`
- `push_subscriptions_empresa_idx`

RLS: habilitado.

## 2. Funções SQL

### `my_empresa_id()`

Retorna a empresa do usuário autenticado.

### `is_admin()`

Verifica se o usuário autenticado tem role `admin`.

### `my_affiliate_id()`

Retorna o `afiliado_id` do usuário autenticado com role `affiliate`.

### `criar_empresa_e_admin(nome_empresa, nome_usuario)`

Cria uma empresa e o profile admin para o usuário autenticado, desde que ele ainda não possua profile.

### `empresas_publico()`

Retorna id + nome de todas as empresas para usuários `anon` e `authenticated`.

### `afiliados_login_publico(p_empresa_id)`

Retorna id + nome dos afiliados ativos de uma empresa que possuem `auth_user_id`, também para `anon` e `authenticated`.

## 3. Triggers

### `despesas_touch`

Atualiza `atualizado_em` antes de UPDATE.

### `pedidos_notificar`

Após INSERT de pedido:
- cria notificação `novo_pedido`.

Após mudança de status:
- `Entregue` → `pedido_entregue`;
- `Pago` → `pedido_pago`.

## 4. AUDITORIA MULTIEMPRESA

### Modelagem

A empresa está explicitamente representada em:

- `profiles.empresa_id`;
- `afiliados.empresa_id`;
- `pedidos.empresa_id`;
- `despesas.empresa_id`;
- `notificacoes.empresa_id`;
- `push_subscriptions.empresa_id`.

### Isolamento por RLS

Há RLS nas tabelas de negócio.

Padrão principal:

```text
auth.uid()
   ↓
profiles
   ↓
my_empresa_id()
   ↓
empresa_id da tabela
```

### Pedidos

Admin:
`is_admin() AND empresa_id = my_empresa_id()`.

Afiliado:
`afiliado_id = my_affiliate_id()` para SELECT.

INSERT do afiliado exige:
`afiliado_id = my_affiliate_id() AND empresa_id = my_empresa_id()`.

Isso fornece uma base forte de isolamento para pedidos.

### Afiliados

Admin é limitado à própria empresa.

Afiliado lê apenas seu próprio registro pelo `auth_user_id`.

### Despesas

Somente admin da própria empresa.

### Notificações

SELECT é limitado à própria empresa.

Entretanto, a policy de UPDATE é:

```sql
using (usuario_id = auth.uid() or empresa_id = public.my_empresa_id())
```

Como existe `OR empresa_id = my_empresa_id()`, qualquer usuário autenticado da empresa pode atualizar notificações da empresa, inclusive campos que não deveriam necessariamente ser editáveis pelo usuário. Isso deve ser tratado como risco de autorização.

### Push subscriptions

INSERT/UPDATE exigem usuário atual e empresa atual.

SELECT/DELETE são limitados ao próprio `user_id`.

### Conclusão da auditoria multiempresa

**Estrutura multiempresa: IMPLEMENTADA.**

**Isolamento por RLS: IMPLEMENTADO nas tabelas principais, com ressalva na policy de UPDATE de notificações.**

Não foi encontrado, no schema analisado, um caminho óbvio para um afiliado inserir pedido em outra empresa porque o INSERT exige simultaneamente seu afiliado e sua empresa.

Não é possível garantir isolamento do ambiente remoto sem executar testes contra o banco publicado.

## 5. Riscos de banco identificados

- policy de UPDATE de notificações ampla;
- funções públicas de login permitem enumeração de nomes de empresas e afiliados ativos;
- ausência de constraints mais fortes ligando `pedidos.afiliado_id` à mesma `empresa_id` do pedido;
- ausência de índices/constraints adicionais não presentes no schema não pode ser descartada no banco remoto, mas não está documentada no repositório.
