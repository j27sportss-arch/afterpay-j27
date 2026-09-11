-- ============================================================
-- Afterpay J27 — Schema multi-empresa (cada operação isolada)
-- Execute este arquivo inteiro no SQL Editor do Supabase,
-- num projeto NOVO e limpo (recomendado) ou no seu projeto atual.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Empresas (cada amigo/operação = uma empresa isolada)
-- ------------------------------------------------------------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Profiles: liga cada usuário logado a UMA empresa e um papel
-- ------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  role text not null check (role in ('admin','affiliate')),
  afiliado_id uuid unique,
  nome text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Afiliados (cada um pertence a UMA empresa)
-- ------------------------------------------------------------
create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_afiliado_fk foreign key (afiliado_id)
  references public.afiliados(id) on delete set null;

-- ------------------------------------------------------------
-- Pedidos (cada um pertence a UMA empresa)
-- ------------------------------------------------------------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente text not null,
  data_pedido date not null default current_date,
  previsao_entrega date,
  custo numeric(12,2) not null default 0 check (custo >= 0),
  venda numeric(12,2) not null default 0 check (venda >= 0),
  status text not null default 'Em Rota'
    check (status in ('Em Rota','Entregue','Não Pago','Pago','Frustrado')),
  forma_pagamento text not null default 'Pendente',
  data_pagamento date,
  afiliado_id uuid references public.afiliados(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists pedidos_empresa_idx on public.pedidos(empresa_id);
create index if not exists pedidos_data_idx on public.pedidos(empresa_id, data_pedido);
create index if not exists pedidos_afiliado_idx on public.pedidos(afiliado_id);
create index if not exists pedidos_status_idx on public.pedidos(empresa_id, status);

-- ------------------------------------------------------------
-- Despesas (tráfego/outras, por dia, por empresa)
-- ------------------------------------------------------------
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data date not null,
  trafego numeric(12,2) not null default 0 check (trafego >= 0),
  outras numeric(12,2) not null default 0 check (outras >= 0),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, data)
);

create index if not exists despesas_empresa_idx on public.despesas(empresa_id);

-- ------------------------------------------------------------
-- Notificações (por empresa, e opcionalmente por usuário)
-- ------------------------------------------------------------
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists notificacoes_empresa_idx on public.notificacoes(empresa_id);
create index if not exists notificacoes_usuario_idx on public.notificacoes(usuario_id);

-- ============================================================
-- Funções auxiliares seguras (usadas pelas políticas de RLS)
-- ============================================================
create or replace function public.my_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_affiliate_id()
returns uuid language sql stable security definer set search_path = public as $$
  select afiliado_id from public.profiles
  where user_id = auth.uid() and role = 'affiliate';
$$;

-- ============================================================
-- Cadastro: cria a empresa + profile admin de forma segura
-- Chamada pelo app logo após o signup (supabase.auth.signUp)
-- ============================================================
create or replace function public.criar_empresa_e_admin(nome_empresa text, nome_usuario text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  nova_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Este usuário já possui uma empresa.';
  end if;

  insert into public.empresas (nome) values (nome_empresa)
  returning id into nova_empresa_id;

  insert into public.profiles (user_id, empresa_id, role, nome)
  values (auth.uid(), nova_empresa_id, 'admin', nome_usuario);

  return nova_empresa_id;
end;
$$;

grant execute on function public.criar_empresa_e_admin(text, text) to authenticated;



-- ------------------------------------------------------------
-- Push subscriptions (Web Push por usuário/empresa)
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_empresa_idx
  on public.push_subscriptions(empresa_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (
    user_id = auth.uid()
    and empresa_id = public.my_empresa_id()
  );

create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and empresa_id = public.my_empresa_id()
  );

create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Row Level Security — cada tabela só mostra dados da própria empresa
-- ============================================================
alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.afiliados enable row level security;
alter table public.pedidos enable row level security;
alter table public.despesas enable row level security;
alter table public.notificacoes enable row level security;

-- empresas: só enxerga a própria
create policy empresas_own on public.empresas
  for select to authenticated
  using (id = public.my_empresa_id());

-- profiles: vê o próprio, e admin vê os da própria empresa
create policy profiles_self on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or empresa_id = public.my_empresa_id());

create policy profiles_admin_manage on public.profiles
  for update to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (empresa_id = public.my_empresa_id());

-- afiliados: admin gerencia os da própria empresa; afiliado vê o próprio registro
create policy afiliados_admin_all on public.afiliados
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (empresa_id = public.my_empresa_id());

create policy afiliados_self_read on public.afiliados
  for select to authenticated
  using (auth_user_id = auth.uid());

-- pedidos: admin vê/gerencia tudo da empresa; afiliado só os próprios
create policy pedidos_admin_all on public.pedidos
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (empresa_id = public.my_empresa_id());

create policy pedidos_affiliate_read on public.pedidos
  for select to authenticated
  using (afiliado_id = public.my_affiliate_id());

create policy pedidos_affiliate_insert on public.pedidos
  for insert to authenticated
  with check (
    afiliado_id = public.my_affiliate_id()
    and empresa_id = public.my_empresa_id()
  );

-- despesas: só admin, só da própria empresa
create policy despesas_admin_all on public.despesas
  for all to authenticated
  using (public.is_admin() and empresa_id = public.my_empresa_id())
  with check (empresa_id = public.my_empresa_id());

-- notificações: cada usuário vê as da própria empresa (e marca como lida as suas)
create policy notificacoes_read on public.notificacoes
  for select to authenticated
  using (empresa_id = public.my_empresa_id());

create policy notificacoes_update_own on public.notificacoes
  for update to authenticated
  using (usuario_id = auth.uid() or empresa_id = public.my_empresa_id())
  with check (empresa_id = public.my_empresa_id());

create policy notificacoes_insert on public.notificacoes
  for insert to authenticated
  with check (empresa_id = public.my_empresa_id());

-- ============================================================
-- Realtime (pra notificações e dashboard atualizarem sozinhos)
-- ============================================================
DO $$ begin
  begin alter publication supabase_realtime add table public.pedidos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.afiliados; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.despesas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notificacoes; exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- Trigger: atualiza automaticamente o "atualizado_em" das despesas
-- ============================================================
create or replace function public.touch_despesa()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists despesas_touch on public.despesas;
create trigger despesas_touch before update on public.despesas
  for each row execute function public.touch_despesa();

-- ============================================================
-- Trigger: quando um pedido novo é criado, gera notificação
-- ============================================================
create or replace function public.notificar_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nome_afiliado text;
begin
  if TG_OP = 'INSERT' then
    select nome into nome_afiliado from public.afiliados where id = new.afiliado_id;
    insert into public.notificacoes (empresa_id, tipo, titulo, mensagem, pedido_id)
    values (
      new.empresa_id,
      'novo_pedido',
      'Novo pedido',
      new.cliente || ' — R$ ' || new.venda::text ||
        case when nome_afiliado is not null then ' (via ' || nome_afiliado || ')' else '' end,
      new.id
    );
  elsif TG_OP = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'Entregue' then
      insert into public.notificacoes (empresa_id, tipo, titulo, mensagem, pedido_id)
      values (new.empresa_id, 'pedido_entregue', 'Pedido entregue', new.cliente || ' foi entregue.', new.id);
    elsif new.status = 'Pago' then
      insert into public.notificacoes (empresa_id, tipo, titulo, mensagem, pedido_id)
      values (new.empresa_id, 'pedido_pago', 'Pedido pago', new.cliente || ' — R$ ' || new.venda::text || ' confirmado.', new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_notificar on public.pedidos;
create trigger pedidos_notificar
  after insert or update on public.pedidos
  for each row execute function public.notificar_pedido();

-- ============================================================
-- Funções públicas de login (só nome + id, nada sensível) —
-- usadas na tela de escolha ANTES da pessoa estar logada.
-- RLS normal bloquearia isso pra usuário anônimo; por isso são
-- security definer, mas só devolvem nome e id, nunca PIN nem e-mail.
-- ============================================================
create or replace function public.empresas_publico()
returns table(id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select id, nome from public.empresas order by nome;
$$;
grant execute on function public.empresas_publico() to anon, authenticated;

create or replace function public.afiliados_login_publico(p_empresa_id uuid)
returns table(id uuid, nome text)
language sql stable security definer set search_path = public as $$
  select id, nome from public.afiliados
  where empresa_id = p_empresa_id and ativo = true and auth_user_id is not null
  order by nome;
$$;
grant execute on function public.afiliados_login_publico(uuid) to anon, authenticated;

-- ============================================================
-- Fim do schema.
-- Próximo passo: criar o app (login/cadastro + telas) que usa
-- esse banco. Isso vem na próxima etapa.
-- ============================================================
