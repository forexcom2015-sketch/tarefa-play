create type public.app_role as enum ('validador','anunciante','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.configuracoes (
  chave text primary key,
  valor text not null,
  descricao text,
  atualizado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.configuracoes to authenticated;
grant all on public.configuracoes to service_role;
alter table public.configuracoes enable row level security;
create policy "config read" on public.configuracoes for select to authenticated using (true);
create policy "config admin write" on public.configuracoes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.configuracoes (chave, valor, descricao) values
('comissao_percentual','35','Comissão da plataforma (%)'),
('saque_minimo','100','Saldo mínimo para saque (R$)'),
('pendente_horas_novos','24','Horas de saldo pendente para contas novas'),
('pacote_validacao_minimo','100','Mínimo de validações por publicação'),
('prazo_habilitacao_horas','2','Prazo de habilitação (horas)'),
('contestacao_horas','48','Prazo para contestação (horas)'),
('bloqueio_horas','24','Duração do bloqueio (horas)'),
('minimo_diario_instagram','10','Mínimo diário de tarefas de Instagram'),
('bloqueio_por_minimo_ativo','true','Bloqueio por mínimo diário ativo'),
('liberacao_ciclica','true','Liberação cíclica de tarefas'),
('valor_avaliacao_interna','0.10','Valor pago por avaliação interna (R$)');

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.categorias to authenticated;
grant select on public.categorias to anon;
grant all on public.categorias to service_role;
alter table public.categorias enable row level security;
create policy "categorias read" on public.categorias for select to anon, authenticated using (ativa or public.has_role(auth.uid(),'admin'));
create policy "categorias admin write" on public.categorias for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.categorias (nome) values
('Carros'),('Motos'),('Casas e imóveis'),('Roupas'),('Calçados'),('Bebidas'),('Bebê e infantil'),('Beleza'),
('Mercado financeiro e educação financeira'),('Tecnologia'),('Pets'),('Viagens'),('Comida'),('Esportes'),('Cursos'),('Outros');

create table public.auditoria (
  id bigserial primary key,
  usuario_id uuid,
  acao text not null,
  entidade text not null,
  dados jsonb,
  criado_em timestamptz not null default now()
);
grant select on public.auditoria to authenticated;
grant all on public.auditoria to service_role;
alter table public.auditoria enable row level security;
create policy "auditoria admin read" on public.auditoria for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (auth.uid(), tg_op, tg_table_name,
    jsonb_build_object('antes', case when tg_op <> 'INSERT' then to_jsonb(old) end,
                       'depois', case when tg_op <> 'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;

create trigger aud_user_roles after insert or update or delete on public.user_roles for each row execute function public.registrar_auditoria();
create trigger aud_configuracoes after insert or update or delete on public.configuracoes for each row execute function public.registrar_auditoria();
create trigger aud_categorias after insert or update or delete on public.categorias for each row execute function public.registrar_auditoria();

create or replace function public.set_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin new.atualizado_em = now(); return new; end $$;
create trigger t_profiles_upd before update on public.profiles for each row execute function public.set_atualizado_em();
create trigger t_config_upd before update on public.configuracoes for each row execute function public.set_atualizado_em();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _perfil text := new.raw_user_meta_data->>'perfil';
begin
  insert into public.profiles (id, nome, telefone)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome',''), new.raw_user_meta_data->>'telefone');
  if _perfil = 'anunciante' then
    insert into public.user_roles (user_id, role) values (new.id, 'anunciante');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'validador');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.registrar_auditoria() from public, anon, authenticated;