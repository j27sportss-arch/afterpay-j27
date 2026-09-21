

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
