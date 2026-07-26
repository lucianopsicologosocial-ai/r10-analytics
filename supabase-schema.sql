-- R10 ANALYTICS — Schema Supabase

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text, email text,
  banca_inicial numeric(10,2) default 100,
  banca_atual numeric(10,2) default 100,
  whatsapp text,
  alerta_ev_minimo numeric(5,2) default 5.0,
  canal_alerta text default 'push',
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  plano text default 'free', -- 'free' | 'basico' | 'premium'
  status text default 'inactive',
  asaas_subscription_id text,
  valor numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists public.apostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  partida text,
  mercado text,
  odds numeric(6,2),
  prob_estimada numeric(5,2),
  valor_apostado numeric(10,2),
  ev_calculado numeric(8,2),
  kelly_usado numeric(5,2),
  resultado text, -- 'ganhou' | 'perdeu' | 'pendente'
  lucro_prejuizo numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists public.analises_jogador (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  jogador_id integer,
  jogador_nome text,
  prob_gol numeric(5,2),
  odds_analisada numeric(6,2),
  ev_resultado numeric(8,2),
  tem_valor boolean,
  created_at timestamptz default now()
);

create table if not exists public.alertas_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  tipo text, -- 'ev_plus' | 'odd_queda' | 'gol_provavel'
  conteudo text,
  canal text, -- 'push' | 'whatsapp'
  enviado_em timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.apostas enable row level security;
alter table public.analises_jogador enable row level security;
alter table public.alertas_enviados enable row level security;

create policy "user_own" on public.profiles for all using (auth.uid() = id);
create policy "user_own" on public.subscriptions for all using (auth.uid() = user_id);
create policy "user_own" on public.apostas for all using (auth.uid() = user_id);
create policy "user_own" on public.analises_jogador for all using (auth.uid() = user_id);
create policy "user_own" on public.alertas_enviados for all using (auth.uid() = user_id);

-- Trigger perfil automático
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, banca_inicial, banca_atual)
  values (new.id, new.raw_user_meta_data->>'nome', new.email,
          (new.raw_user_meta_data->>'banca_inicial')::numeric,
          (new.raw_user_meta_data->>'banca_inicial')::numeric);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
