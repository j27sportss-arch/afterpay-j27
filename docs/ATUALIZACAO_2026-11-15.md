# Afterpay J27 — Atualização técnica de 15/11/2026

Este documento registra o estado do ZIP atualizado. Ele prevalece sobre observações históricas dos relatórios de 21/09/2026 quando houver divergência.

## 1. Auditoria do código recebido

- O projeto continua em Next.js 14.2.5, React 18.3.1, Supabase JS e Tailwind CSS.
- As funções `completarCadastroEmpresa()` e `tentarCompletarCadastroAutomatico()` **já estavam presentes** em `src/lib/db.js` no ZIP recebido. A afirmação antiga de que estavam ausentes não se aplica a esta versão.
- `fetchMyProfile()` usava `.single()`, o que lançava erro quando uma sessão ainda não possuía linha em `profiles`. Foi alterado para `.maybeSingle()` para permitir o fluxo de conclusão automática do cadastro.
- O fluxo de cadastro automático foi protegido contra a corrida entre o evento `SIGNED_IN` e a RPC chamada pelo formulário de signup; após uma possível criação concorrente, o profile é relido.
- A interface anterior era majoritariamente verde, concentrada em um único `AppInner.jsx`, e não possuía catálogo de produtos.
- Não havia `public/manifest.json`. O manifesto foi adicionado nesta atualização.
- A configuração de Supabase, Vercel, webhooks, secrets e o schema remoto não podem ser confirmados pelo ZIP.

## 2. Funcionalidades adicionadas

### Produtos

Tabela `public.produtos`, isolada por `empresa_id`, com:

- nome;
- URL de imagem opcional;
- SKU opcional;
- custo de aquisição;
- preço de venda;
- status ativo/inativo;
- datas de criação e atualização.

Lucro bruto unitário e margem bruta são calculados na interface:

`lucro bruto unitário = preço de venda - custo`

`margem bruta = lucro bruto unitário / preço de venda × 100`

As imagens são informadas por URL HTTPS nesta versão; não foi criado bucket de Storage.

### Integração com pedidos

- Administradores e afiliados podem selecionar produtos ativos ao criar pedidos.
- A seleção preenche nome, custo e preço de venda.
- O preço e o custo podem ser ajustados no pedido.
- `pedidos.produto_nome` guarda o nome histórico.
- Os campos já existentes `pedidos.custo` e `pedidos.venda` continuam sendo os snapshots financeiros.
- Alterações posteriores no cadastro do produto não atualizam pedidos antigos.
- Ao excluir um produto, a FK `produto_id` fica nula e o nome/custo/venda históricos permanecem.
- Um trigger impede associar a um pedido um produto ou afiliado de outra empresa.

## 3. Segurança e RLS

A migration `202611150001_produtos_pedidos_financeiro.sql`:

- habilita RLS em `produtos`;
- permite CRUD de produtos somente ao administrador da própria empresa;
- permite ao afiliado consultar apenas produtos ativos da própria empresa;
- corrige `WITH CHECK` das policies de afiliados, despesas, pedidos e profiles para exigir `is_admin()` nas operações administrativas;
- restringe UPDATE de notificações ao próprio usuário ou ao administrador da empresa (notificações compartilhadas);
- restringe INSERT manual de notificações a administradores;
- inclui a tabela `produtos` na publicação Realtime quando disponível.

A Edge Function `push-notification` agora exige `PUSH_WEBHOOK_SECRET`. Se o secret estiver ausente, responde `503`; se o header estiver incorreto, responde `401`.

## 4. Dashboard e interface

- Identidade visual atualizada para azul-marinho, azul elétrico e violeta.
- Sidebar para desktop e navegação inferior para dispositivos móveis.
- Tela de produtos com busca, filtros, métricas e ações de editar, ativar/desativar e excluir.
- Dashboard com filtros Hoje, 7 dias, Este mês, Todo período e Personalizado.
- Faturamento previsto e faturamento recebido são exibidos separadamente.
- Lucro bruto previsto e resultado após despesas registradas são identificados como estimativas.
- O dashboard informa que taxas, impostos, frete e custos não registrados não estão incluídos; não chama esse resultado de lucro líquido real.
- Inclui gráfico simples dos últimos sete dias e indicadores operacionais.

## 5. Correções adicionais

- `subscribeAll()` agora também observa mudanças na tabela `produtos`.
- A atualização de pedidos agora persiste também a troca do afiliado selecionado no formulário administrativo.
- Dependências que estavam declaradas como `latest` foram fixadas às versões presentes no lockfile.
- Foi adicionado `public/manifest.json` e os ícones SVG foram alinhados à nova identidade visual.
- A Edge Function `create-affiliate` valida método HTTP e configuração obrigatória do Supabase.
- O formulário de despesas passou a apresentar erros de gravação em vez de falhar silenciosamente.

## 6. Migration

Para um banco existente, executar **somente**:

`supabase/migrations/202611150001_produtos_pedidos_financeiro.sql`

O arquivo também está disponível na raiz como `migration_afterpay_j27.sql`.

Para uma instalação nova, `supabase/schema.sql` inclui o bloco incremental de produtos no final.

A migration depende das funções já documentadas no banco:

- `public.my_empresa_id()`;
- `public.is_admin()`;
- `public.my_affiliate_id()`.

Não foi executada contra um Supabase remoto, pois o ZIP não contém credenciais nem acesso ao projeto remoto.

## 7. Validação e limitações

- A estrutura JSX/JavaScript foi verificada com o parser TypeScript disponível no ambiente.
- O `npm ci` não pôde ser concluído: o ambiente não conseguiu resolver `registry.npmjs.org` e a instalação offline não possuía todos os pacotes em cache.
- Consequentemente, `next build` não foi executado e não deve ser considerado validado.
- Não foi possível testar autenticação, RLS, Realtime, notificações Push ou CRUD real sem credenciais e banco Supabase remoto.
- O estado remoto da Vercel, GitHub, Supabase, Database Webhook e secrets continua não verificável pelo repositório.
