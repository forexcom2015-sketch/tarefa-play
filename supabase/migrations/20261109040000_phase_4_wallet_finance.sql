-- Fase 4: carteira, livro-razao append-only e fluxo financeiro simulado.
-- Nenhuma integracao de pagamento real e criada nesta fase.

create table if not exists public.carteiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete restrict,
  codigo_indicacao text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  criado_em timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid not null references public.carteiras(id) on delete restrict,
  tipo text not null check (tipo in ('deposito','reserva','liberacao_reserva','pagamento_tarefa','comissao','bonus','saque','estorno','ajuste')),
  valor numeric(14,2) not null check (valor <> 0),
  status text not null check (status in ('confirmado','solicitado','simulado')),
  disponivel_em timestamptz not null default now(),
  referencia_tipo text,
  referencia_id uuid,
  criado_em timestamptz not null default now(),
  constraint lancamentos_saque_negativo check (tipo <> 'saque' or valor < 0),
  constraint lancamentos_reserva_negativo check (tipo <> 'reserva' or valor < 0),
  constraint lancamentos_liberacao_positiva check (tipo <> 'liberacao_reserva' or valor > 0),
  constraint lancamentos_deposito_positivo check (tipo <> 'deposito' or valor > 0),
  constraint lancamentos_bonus_positivo check (tipo <> 'bonus' or valor > 0)
);

create index if not exists lancamentos_carteira_data_idx
  on public.lancamentos (carteira_id, criado_em desc);
create index if not exists lancamentos_disponibilidade_idx
  on public.lancamentos (carteira_id, disponivel_em);
create unique index if not exists lancamentos_pagamento_tarefa_referencia_unique
  on public.lancamentos (carteira_id, tipo, referencia_tipo, referencia_id)
  where tipo in ('pagamento_tarefa','comissao') and referencia_id is not null;

create table if not exists public.saques (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid not null references public.carteiras(id) on delete restrict,
  lancamento_id uuid not null unique references public.lancamentos(id) on delete restrict,
  valor numeric(14,2) not null check (valor > 0),
  status text not null default 'solicitado' check (status in ('solicitado','pago','rejeitado')),
  solicitado_em timestamptz not null default now(),
  revisado_em timestamptz,
  revisado_por uuid references auth.users(id)
);

create index if not exists saques_status_data_idx on public.saques(status, solicitado_em);

create table if not exists public.niveis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem smallint not null unique check (ordem > 0),
  tarefas_validas_minimas integer not null default 0 check (tarefas_validas_minimas >= 0),
  bonus_percentual numeric(5,2) not null default 0 check (bonus_percentual >= 0 and bonus_percentual <= 100),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.niveis (nome, ordem, tarefas_validas_minimas, bonus_percentual)
values
  ('Bronze', 1, 0, 0),
  ('Prata', 2, 50, 0),
  ('Ouro', 3, 200, 0),
  ('Diamante', 4, 500, 0)
on conflict (nome) do nothing;

create table if not exists public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references auth.users(id) on delete restrict,
  indicado_id uuid not null unique references auth.users(id) on delete restrict,
  codigo_indicacao text not null,
  bonus_percentual numeric(5,2) not null default 0 check (bonus_percentual >= 0 and bonus_percentual <= 100),
  status text not null default 'registrada' check (status in ('registrada','elegivel','bonus_pago')),
  criado_em timestamptz not null default now(),
  constraint indicacao_nao_propria check (indicador_id <> indicado_id)
);

create index if not exists indicacoes_indicador_idx on public.indicacoes(indicador_id, criado_em desc);

alter table public.carteiras enable row level security;
alter table public.lancamentos enable row level security;
alter table public.saques enable row level security;
alter table public.niveis enable row level security;
alter table public.indicacoes enable row level security;

drop policy if exists carteiras_select_owner_admin on public.carteiras;
create policy carteiras_select_owner_admin on public.carteiras
for select to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

drop policy if exists lancamentos_select_owner_admin on public.lancamentos;
create policy lancamentos_select_owner_admin on public.lancamentos
for select to authenticated
using (exists (
  select 1 from public.carteiras c
  where c.id = carteira_id
    and (c.usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
));

drop policy if exists saques_select_owner_admin on public.saques;
create policy saques_select_owner_admin on public.saques
for select to authenticated
using (exists (
  select 1 from public.carteiras c
  where c.id = carteira_id
    and (c.usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
));

drop policy if exists saques_admin_update on public.saques;
create policy saques_admin_update on public.saques
for update to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists niveis_read_active on public.niveis;
drop policy if exists niveis_anon_read_active on public.niveis;
drop policy if exists niveis_authenticated_read_active on public.niveis;
create policy niveis_anon_read_active on public.niveis
for select to anon using (ativo);
create policy niveis_authenticated_read_active on public.niveis
for select to authenticated using (ativo or (select private.has_role('admin'::app_role)));

drop policy if exists niveis_admin_manage on public.niveis;
create policy niveis_admin_manage on public.niveis
for all to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists indicacoes_select_owner_admin on public.indicacoes;
create policy indicacoes_select_owner_admin on public.indicacoes
for select to authenticated
using (indicador_id = (select auth.uid()) or indicado_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

revoke all on public.carteiras, public.lancamentos, public.saques, public.niveis, public.indicacoes from anon, authenticated;
grant select on public.carteiras, public.lancamentos, public.saques, public.niveis, public.indicacoes to authenticated;
grant select on public.niveis to anon;
grant update on public.saques to authenticated;
grant insert, update, delete on public.niveis to authenticated;

-- Configuracoes que controlam simulacoes e indicacoes. O deposito simulado
-- inicia desativado para impedir credito gratuito em contas de producao.
insert into public.configuracoes (chave, valor, descricao)
values
  ('financeiro_mock_ativo', 'false', 'Permite depositos exclusivamente simulados. Manter desativado ate autorizacao administrativa.'),
  ('bonus_indicacao_percentual', '5', 'Percentual de bonus de indicacao de nivel unico, aplicado por funcao financeira autorizada.')
on conflict (chave) do nothing;

create or replace function public.obter_ou_criar_carteira()
returns public.carteiras
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_carteira public.carteiras;
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria.';
  end if;

  insert into public.carteiras (usuario_id)
  values (auth.uid())
  on conflict (usuario_id) do nothing;

  select * into v_carteira
  from public.carteiras
  where usuario_id = auth.uid();

  return v_carteira;
end;
$$;

create or replace view public.saldo_disponivel
with (security_invoker = true)
as
select
  c.id as carteira_id,
  c.usuario_id,
  coalesce(sum(l.valor), 0)::numeric(14,2) as saldo
from public.carteiras c
left join public.lancamentos l
  on l.carteira_id = c.id
  and l.disponivel_em <= now()
  and l.status in ('confirmado','solicitado','simulado')
  and not (
    l.tipo in ('pagamento_tarefa','comissao')
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = c.usuario_id and ur.role = 'anunciante'
    )
  )
group by c.id, c.usuario_id;

create or replace view public.saldo_pendente
with (security_invoker = true)
as
select
  c.id as carteira_id,
  c.usuario_id,
  coalesce(sum(l.valor), 0)::numeric(14,2) as saldo
from public.carteiras c
left join public.lancamentos l
  on l.carteira_id = c.id
  and l.disponivel_em > now()
  and l.status in ('confirmado','simulado')
group by c.id, c.usuario_id;

create or replace view public.saldo_reservado
with (security_invoker = true)
as
select
  c.id as carteira_id,
  c.usuario_id,
  greatest(
    coalesce(sum(case when l.tipo = 'reserva' then -l.valor else 0 end), 0)
    - coalesce(sum(case when l.tipo in ('pagamento_tarefa','comissao') and l.valor < 0 then -l.valor else 0 end), 0)
    - coalesce(sum(case when l.tipo = 'liberacao_reserva' then l.valor else 0 end), 0),
    0
  )::numeric(14,2) as saldo
from public.carteiras c
left join public.lancamentos l on l.carteira_id = c.id
group by c.id, c.usuario_id;

grant select on public.saldo_disponivel, public.saldo_pendente, public.saldo_reservado to authenticated;

create or replace function public.depositar_mock(p_valor numeric)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_carteira public.carteiras;
  v_ativo boolean;
  v_id uuid;
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Somente Anunciantes autenticados podem usar o deposito simulado.';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 10000 then
    raise exception 'O valor simulado deve ser maior que zero e limitado a R$ 10.000,00.';
  end if;

  select (valor = 'true') into v_ativo from public.configuracoes where chave = 'financeiro_mock_ativo';
  if coalesce(v_ativo, false) is not true then
    raise exception 'Depositos simulados estao desativados pela administracao.';
  end if;

  v_carteira := public.obter_ou_criar_carteira();
  insert into public.lancamentos (carteira_id, tipo, valor, status, referencia_tipo)
  values (v_carteira.id, 'deposito', round(p_valor, 2), 'simulado', 'deposito_mock')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.reservar_pacote(p_valor numeric, p_referencia_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_carteira public.carteiras;
  v_saldo numeric(14,2);
  v_id uuid;
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Somente Anunciantes autenticados podem reservar pacotes.';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'O valor da reserva deve ser maior que zero.';
  end if;

  v_carteira := public.obter_ou_criar_carteira();
  perform pg_advisory_xact_lock(hashtext(v_carteira.id::text));
  select coalesce(sum(valor), 0) into v_saldo
  from public.lancamentos
  where carteira_id = v_carteira.id
    and disponivel_em <= now()
    and status in ('confirmado','solicitado','simulado')
    and tipo not in ('pagamento_tarefa','comissao');

  if v_saldo < round(p_valor, 2) then
    raise exception 'Saldo disponivel insuficiente para reservar este pacote.';
  end if;

  insert into public.lancamentos (carteira_id, tipo, valor, status, referencia_tipo, referencia_id)
  values (v_carteira.id, 'reserva', -round(p_valor, 2), 'confirmado', 'pacote', p_referencia_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.pagar_tarefa(p_anunciante_id uuid, p_validador_id uuid, p_valor_validador numeric, p_referencia_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_carteira_anunciante public.carteiras;
  v_carteira_validador public.carteiras;
  v_comissao_pct numeric(8,4);
  v_comissao numeric(14,2);
  v_bruto numeric(14,2);
  v_reservado numeric(14,2);
  v_pendente_horas integer;
  v_primeiro_pagamento boolean;
  v_disponivel_em timestamptz;
begin
  if auth.uid() is null or not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente o Admin pode confirmar pagamentos internos nesta fase.';
  end if;
  if p_valor_validador is null or p_valor_validador <= 0 or p_anunciante_id = p_validador_id or p_referencia_id is null then
    raise exception 'Parametros de pagamento invalidos.';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_anunciante_id and role = 'anunciante')
    or not exists (select 1 from public.user_roles where user_id = p_validador_id and role = 'validador') then
    raise exception 'Os papeis do Anunciante e do Validador nao correspondem.';
  end if;

  select * into v_carteira_anunciante from public.carteiras where usuario_id = p_anunciante_id;
  if v_carteira_anunciante.id is null then raise exception 'Carteira do Anunciante nao encontrada.'; end if;
  v_carteira_validador := null;
  insert into public.carteiras (usuario_id) values (p_validador_id)
  on conflict (usuario_id) do nothing;
  select * into v_carteira_validador from public.carteiras where usuario_id = p_validador_id;

  perform pg_advisory_xact_lock(hashtext(v_carteira_anunciante.id::text));
  select coalesce(sum(
    case
      when tipo = 'reserva' then -valor
      when tipo in ('pagamento_tarefa','comissao') and valor < 0 then valor
      when tipo = 'liberacao_reserva' then -valor
      else 0
    end
  ), 0) into v_reservado
  from public.lancamentos where carteira_id = v_carteira_anunciante.id;

  select coalesce(valor::numeric, 35) into v_comissao_pct from public.configuracoes where chave = 'comissao_percentual';
  if v_comissao_pct < 0 or v_comissao_pct >= 100 then raise exception 'Percentual de comissao invalido.'; end if;
  v_comissao := round(p_valor_validador * v_comissao_pct / (100 - v_comissao_pct), 2);
  v_bruto := round(p_valor_validador, 2) + v_comissao;
  if v_reservado < v_bruto then raise exception 'Saldo reservado insuficiente para pagar esta tarefa.'; end if;

  select coalesce(valor::integer, 24) into v_pendente_horas from public.configuracoes where chave = 'pendente_horas_novos';
  select not exists (
    select 1 from public.lancamentos
    where carteira_id = v_carteira_validador.id
      and tipo = 'pagamento_tarefa'
      and valor > 0
      and disponivel_em <= now()
  ) into v_primeiro_pagamento;
  v_disponivel_em := case when v_primeiro_pagamento then now() + make_interval(hours => greatest(v_pendente_horas, 0)) else now() end;

  insert into public.lancamentos (carteira_id, tipo, valor, status, disponivel_em, referencia_tipo, referencia_id)
  values
    (v_carteira_anunciante.id, 'pagamento_tarefa', -round(p_valor_validador, 2), 'confirmado', now(), 'tarefa', p_referencia_id),
    (v_carteira_anunciante.id, 'comissao', -v_comissao, 'confirmado', now(), 'tarefa', p_referencia_id),
    (v_carteira_validador.id, 'pagamento_tarefa', round(p_valor_validador, 2), 'confirmado', v_disponivel_em, 'tarefa', p_referencia_id);
  return v_bruto;
end;
$$;

create or replace function public.solicitar_saque(p_valor numeric)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_carteira public.carteiras;
  v_minimo numeric(14,2);
  v_saldo numeric(14,2);
  v_documento text;
  v_pix public.contas_pix;
  v_lancamento uuid;
  v_saque uuid;
begin
  if auth.uid() is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores podem solicitar saque.';
  end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Informe um valor valido para saque.'; end if;

  v_carteira := public.obter_ou_criar_carteira();
  perform pg_advisory_xact_lock(hashtext(v_carteira.id::text));

  select coalesce(valor::numeric, 100) into v_minimo from public.configuracoes where chave = 'saque_minimo';
  if p_valor < v_minimo then raise exception 'O saque minimo e de R$ %.', to_char(v_minimo, 'FM999G999G990D00'); end if;

  select documento_normalizado into v_documento
  from public.documentos_usuarios where usuario_id = auth.uid() and tipo_documento = 'cpf';
  select * into v_pix from public.contas_pix where usuario_id = auth.uid();

  if v_documento is null or v_pix.usuario_id is null or v_pix.aprovado is not true
    or v_pix.titular_cpf_normalizado <> v_documento then
    raise exception 'Cadastre e aguarde a aprovacao de uma conta Pix com titular igual ao CPF do cadastro.';
  end if;

  select coalesce(sum(valor), 0) into v_saldo
  from public.lancamentos
  where carteira_id = v_carteira.id
    and disponivel_em <= now()
    and status in ('confirmado','solicitado','simulado');
  if v_saldo < round(p_valor, 2) then raise exception 'Saldo disponivel insuficiente.'; end if;

  insert into public.lancamentos (carteira_id, tipo, valor, status, referencia_tipo)
  values (v_carteira.id, 'saque', -round(p_valor, 2), 'solicitado', 'saque')
  returning id into v_lancamento;

  insert into public.saques (carteira_id, lancamento_id, valor)
  values (v_carteira.id, v_lancamento, round(p_valor, 2))
  returning id into v_saque;
  return v_saque;
end;
$$;

create or replace function public.marcar_saque_pago(p_saque_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente o Admin pode marcar um saque como pago.';
  end if;
  update public.saques
  set status = 'pago', revisado_em = now(), revisado_por = auth.uid()
  where id = p_saque_id and status = 'solicitado';
  if not found then raise exception 'Saque nao encontrado ou ja revisado.'; end if;
end;
$$;

create or replace function public.registrar_indicacao(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_indicador uuid;
  v_percentual numeric(5,2);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticacao obrigatoria.'; end if;
  if p_codigo is null or length(trim(p_codigo)) < 6 then raise exception 'Codigo de indicacao invalido.'; end if;
  select usuario_id into v_indicador from public.carteiras
  where codigo_indicacao = upper(trim(p_codigo));
  if v_indicador is null or v_indicador = auth.uid() then raise exception 'Codigo de indicacao invalido.'; end if;
  if exists (select 1 from public.indicacoes where indicado_id = auth.uid()) then
    raise exception 'Esta conta ja possui uma indicacao registrada.';
  end if;
  select coalesce(valor::numeric, 5) into v_percentual from public.configuracoes where chave = 'bonus_indicacao_percentual';
  insert into public.indicacoes (indicador_id, indicado_id, codigo_indicacao, bonus_percentual)
  values (v_indicador, auth.uid(), upper(trim(p_codigo)), v_percentual)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.obter_ou_criar_carteira() from public, anon;
revoke all on function public.depositar_mock(numeric) from public, anon;
revoke all on function public.reservar_pacote(numeric, uuid) from public, anon;
revoke all on function public.pagar_tarefa(uuid, uuid, numeric, uuid) from public, anon;
revoke all on function public.solicitar_saque(numeric) from public, anon;
revoke all on function public.marcar_saque_pago(uuid) from public, anon;
revoke all on function public.registrar_indicacao(text) from public, anon;

grant execute on function public.obter_ou_criar_carteira() to authenticated;
grant execute on function public.depositar_mock(numeric) to authenticated;
grant execute on function public.reservar_pacote(numeric, uuid) to authenticated;
grant execute on function public.pagar_tarefa(uuid, uuid, numeric, uuid) to authenticated;
grant execute on function public.solicitar_saque(numeric) to authenticated;
grant execute on function public.marcar_saque_pago(uuid) to authenticated;
grant execute on function public.registrar_indicacao(text) to authenticated;

-- Credito de indicacao em um unico nivel. A chamada e administrativa e
-- idempotente; o bonus sai de uma base explicitamente informada pelo fluxo futuro.
create unique index if not exists lancamentos_bonus_indicacao_referencia_unique
  on public.lancamentos (carteira_id, referencia_tipo, referencia_id)
  where tipo = 'bonus' and referencia_tipo = 'indicacao' and referencia_id is not null;

create or replace function public.creditar_bonus_indicacao(p_indicado_id uuid, p_base_calculo numeric, p_referencia_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_indicacao public.indicacoes;
  v_carteira public.carteiras;
  v_bonus numeric(14,2);
begin
  if auth.uid() is null or not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente o Admin pode autorizar bonus de indicacao nesta fase.';
  end if;
  if p_indicado_id is null or p_referencia_id is null or p_base_calculo is null or p_base_calculo <= 0 then
    raise exception 'Dados para calculo do bonus invalidos.';
  end if;

  select * into v_indicacao
  from public.indicacoes
  where indicado_id = p_indicado_id
  for update;
  if v_indicacao.id is null then
    raise exception 'Indicacao nao encontrada.';
  end if;
  if v_indicacao.status = 'bonus_pago' then
    raise exception 'O bonus desta indicacao ja foi pago.';
  end if;

  v_bonus := round(p_base_calculo * v_indicacao.bonus_percentual / 100, 2);
  if v_bonus <= 0 then
    update public.indicacoes set status = 'bonus_pago' where id = v_indicacao.id;
    return 0;
  end if;

  insert into public.carteiras (usuario_id)
  values (v_indicacao.indicador_id)
  on conflict (usuario_id) do nothing;
  select * into v_carteira from public.carteiras where usuario_id = v_indicacao.indicador_id;

  insert into public.lancamentos (
    carteira_id, tipo, valor, status, disponivel_em, referencia_tipo, referencia_id
  )
  values (
    v_carteira.id, 'bonus', v_bonus, 'confirmado', now(), 'indicacao', v_indicacao.id
  );

  update public.indicacoes set status = 'bonus_pago' where id = v_indicacao.id;
  return v_bonus;
end;
$$;

revoke all on function public.creditar_bonus_indicacao(uuid, numeric, uuid) from public, anon;
grant execute on function public.creditar_bonus_indicacao(uuid, numeric, uuid) to authenticated;
