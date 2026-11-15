-- Afterpay J27 — Produtos, vínculo com pedidos e endurecimento de RLS
-- Migration incremental e segura para bancos que já possuem o schema anterior.

begin;

-- -----------------------------------------------------------------------------
-- Catálogo de produtos por operação
-- -----------------------------------------------------------------------------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  imagem_url text,
  sku text,
  custo numeric(12,2) not null default 0 check (custo >= 0),
  preco_venda numeric(12,2) not null default 0 check (preco_venda >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists produtos_empresa_idx
  on public.produtos(empresa_id);

create index if not exists produtos_empresa_ativo_idx
  on public.produtos(empresa_id, ativo);

create index if not exists produtos_empresa_nome_idx
  on public.produtos(empresa_id, nome);

create unique index if not exists produtos_empresa_sku_uidx
  on public.produtos(empresa_id, lower(btrim(sku)))
  where sku is not null and btrim(sku) <> '';

-- -----------------------------------------------------------------------------
-- Snapshot do produto no pedido
-- `custo` e `venda` já existiam e continuam sendo os valores históricos.
-- `produto_nome` preserva o nome mesmo se o produto for renomeado/excluído.
-- -----------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists produto_id uuid;

alter table public.pedidos
  add column if not exists produto_nome text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pedidos_produto_id_fkey'
      AND conrelid = 'public.pedidos'::regclass
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_produto_id_fkey
      FOREIGN KEY (produto_id)
      REFERENCES public.produtos(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists pedidos_produto_idx
  on public.pedidos(produto_id)
  where produto_id is not null;

-- -----------------------------------------------------------------------------
-- Atualização de timestamp de produto
-- -----------------------------------------------------------------------------
create or replace function public.touch_produto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists produtos_touch on public.produtos;
create trigger produtos_touch
  before update on public.produtos
  for each row execute function public.touch_produto();

-- -----------------------------------------------------------------------------
-- Integridade multiempresa: pedido só pode apontar para afiliado/produto
-- da mesma empresa. Produto inativo não pode ser associado a um novo pedido,
-- mas pedidos históricos continuam podendo ser editados sem trocar o produto.
-- -----------------------------------------------------------------------------
create or replace function public.validar_vinculos_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_ativo boolean;
begin
  if new.afiliado_id is not null then
    select empresa_id
      into v_empresa_id
      from public.afiliados
      where id = new.afiliado_id;

    if v_empresa_id is null or v_empresa_id is distinct from new.empresa_id then
      raise exception 'O afiliado selecionado não pertence a esta operação.';
    end if;
  end if;

  if new.produto_id is not null then
    select empresa_id, ativo
      into v_empresa_id, v_ativo
      from public.produtos
      where id = new.produto_id;

    if v_empresa_id is null or v_empresa_id is distinct from new.empresa_id then
      raise exception 'O produto selecionado não pertence a esta operação.';
    end if;

    if v_ativo is not true then
      if tg_op = 'INSERT' then
        raise exception 'Não é possível associar um produto inativo a um novo pedido.';
      elsif old.produto_id is distinct from new.produto_id then
        raise exception 'Não é possível associar um produto inativo a um novo pedido.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_validar_vinculos on public.pedidos;
create trigger pedidos_validar_vinculos
  before insert or update of empresa_id, afiliado_id, produto_id on public.pedidos
  for each row execute function public.validar_vinculos_pedido();

-- -----------------------------------------------------------------------------
-- Realtime do catálogo
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- -----------------------------------------------------------------------------
-- RLS do catálogo
-- -----------------------------------------------------------------------------
alter table public.produtos enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'produtos'
      AND policyname = 'produtos_admin_manage'
  ) THEN
    CREATE POLICY produtos_admin_manage
      ON public.produtos FOR ALL TO authenticated
      USING (public.is_admin() AND empresa_id = public.my_empresa_id())
      WITH CHECK (public.is_admin() AND empresa_id = public.my_empresa_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'produtos'
      AND policyname = 'produtos_affiliate_read_active'
  ) THEN
    CREATE POLICY produtos_affiliate_read_active
      ON public.produtos FOR SELECT TO authenticated
      USING (empresa_id = public.my_empresa_id() AND ativo = true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Corrige políticas existentes cujo WITH CHECK não exigia papel de admin.
-- A policy de afiliado para INSERT em pedidos permanece separada e ativa.
-- -----------------------------------------------------------------------------
drop policy if exists afiliados_admin_all on public.afiliados;
create policy afiliados_admin_all on public.afiliados
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (public.is_admin() and empresa_id = public.my_empresa_id());

drop policy if exists despesas_admin_all on public.despesas;
create policy despesas_admin_all on public.despesas
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (public.is_admin() and empresa_id = public.my_empresa_id());

drop policy if exists pedidos_admin_all on public.pedidos;
create policy pedidos_admin_all on public.pedidos
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (public.is_admin() and empresa_id = public.my_empresa_id());

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles
  for update to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (public.is_admin() and empresa_id = public.my_empresa_id());

-- Usuários só atualizam notificações destinadas a eles.
-- Notificações compartilhadas (usuario_id NULL) só podem ser marcadas
-- como lidas por administradores da própria empresa.
drop policy if exists notificacoes_update_own on public.notificacoes;
create policy notificacoes_update_own on public.notificacoes
  for update to authenticated
  using (
    empresa_id = public.my_empresa_id()
    and (
      public.is_admin()
      or usuario_id = auth.uid()
    )
  )
  with check (
    empresa_id = public.my_empresa_id()
    and (
      public.is_admin()
      or usuario_id = auth.uid()
    )
  );

-- Criação manual de notificações é restrita a administradores.
-- Triggers SECURITY DEFINER existentes continuam podendo gerar notificações.
drop policy if exists notificacoes_insert on public.notificacoes;
create policy notificacoes_insert on public.notificacoes
  for insert to authenticated
  with check (empresa_id = public.my_empresa_id() and public.is_admin());

commit;
