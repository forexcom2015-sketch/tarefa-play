-- Fase 5: janela do Validador, feed por interesses e habilitacoes com prazo.
-- A execucao/verificacao das tarefas permanece desativada nesta fase.

create table if not exists public.canais (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.tipos_tarefa (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais(id) on delete restrict,
  acao text not null,
  nome text not null,
  valor_validador numeric(10,2) not null check (valor_validador > 0),
  metodo_verificacao text not null check (metodo_verificacao in ('avaliacao_interna','token_lista','codigo_no_conteudo','link_rastreado')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (canal_id, acao)
);

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  -- A Fase 6 criara publicacoes; a FK sera adicionada quando essa tabela existir.
  publicacao_id uuid,
  tipo_tarefa_id uuid not null references public.tipos_tarefa(id) on delete restrict,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  vagas integer not null check (vagas > 0),
  vagas_ocupadas integer not null default 0 check (vagas_ocupadas >= 0 and vagas_ocupadas <= vagas),
  link_destino text,
  tempo_estimado_minutos integer not null default 5 check (tempo_estimado_minutos > 0),
  status text not null default 'ativa' check (status in ('ativa','pausada','encerrada')),
  is_demo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists tarefas_feed_idx
  on public.tarefas (status, categoria_id, criado_em desc);
create index if not exists tarefas_tipo_idx on public.tarefas (tipo_tarefa_id);
create index if not exists tipos_tarefa_canal_ativo_idx on public.tipos_tarefa (canal_id, ativo);

create table if not exists public.habilitacoes (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete restrict,
  validador_id uuid not null references auth.users(id) on delete restrict,
  handle text not null,
  status text not null default 'habilitado'
    check (status in ('habilitado','em_andamento','validada','expirada','desistiu','rejeitada')),
  expira_em timestamptz not null,
  validada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists habilitacoes_validador_status_idx
  on public.habilitacoes (validador_id, status, expira_em desc);
create index if not exists habilitacoes_tarefa_status_idx
  on public.habilitacoes (tarefa_id, status, expira_em);
create unique index if not exists habilitacoes_ativas_unique
  on public.habilitacoes (tarefa_id, validador_id)
  where status in ('habilitado','em_andamento');

alter table public.canais enable row level security;
alter table public.tipos_tarefa enable row level security;
alter table public.tarefas enable row level security;
alter table public.habilitacoes enable row level security;

drop policy if exists canais_select_authenticated on public.canais;
create policy canais_select_authenticated on public.canais
for select to authenticated
using (ativo or (select private.has_role('admin'::app_role)));

drop policy if exists canais_admin_manage on public.canais;
create policy canais_admin_manage on public.canais
for all to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists tipos_tarefa_select_authenticated on public.tipos_tarefa;
create policy tipos_tarefa_select_authenticated on public.tipos_tarefa
for select to authenticated
using (ativo or (select private.has_role('admin'::app_role)));

drop policy if exists tipos_tarefa_admin_manage on public.tipos_tarefa;
create policy tipos_tarefa_admin_manage on public.tipos_tarefa
for all to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists tarefas_select_validator_interests_admin on public.tarefas;
create policy tarefas_select_validator_interests_admin on public.tarefas
for select to authenticated
using (
  (select private.has_role('admin'::app_role))
  or (
    status = 'ativa'
    and (select private.has_role('validador'::app_role))
    and exists (select 1 from public.aceites_contrato ac where ac.usuario_id = (select auth.uid()))
    and exists (
      select 1 from public.cadastro_validadores cv
      where cv.usuario_id = (select auth.uid())
        and cv.maior_de_18 = true
        and cv.consentimento_lgpd_interesses = true
    )
    and exists (
      select 1 from public.documentos_usuarios du
      where du.usuario_id = (select auth.uid()) and du.tipo_documento = 'cpf'
    )
    and (select count(*) from public.interesses_validador iv where iv.usuario_id = (select auth.uid())) between 3 and 8
    and exists (
      select 1 from public.contas_pix cp
      where cp.usuario_id = (select auth.uid()) and cp.aprovado = true
    )
    and exists (
      select 1 from public.contas_sociais cs
      where cs.usuario_id = (select auth.uid()) and cs.canal = 'instagram' and cs.status = 'aprovada'
    )
    and exists (
      select 1
      from public.interesses_validador i
      where i.usuario_id = (select auth.uid())
        and i.categoria_id = tarefas.categoria_id
    )
  )
);

drop policy if exists tarefas_admin_manage on public.tarefas;
create policy tarefas_admin_manage on public.tarefas
for all to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists habilitacoes_select_owner_admin on public.habilitacoes;
create policy habilitacoes_select_owner_admin on public.habilitacoes
for select to authenticated
using (validador_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

revoke all on public.canais, public.tipos_tarefa, public.tarefas, public.habilitacoes from anon, authenticated;
grant select on public.canais, public.tipos_tarefa, public.tarefas, public.habilitacoes to authenticated;
grant insert, update, delete on public.canais, public.tipos_tarefa, public.tarefas to authenticated;

insert into public.canais (slug, nome)
values ('instagram','Instagram'), ('site','Site'), ('youtube','YouTube')
on conflict (slug) do update set nome = excluded.nome;

insert into public.tipos_tarefa (canal_id, acao, nome, valor_validador, metodo_verificacao)
select c.id, seed.acao, seed.nome, seed.valor, seed.metodo
from (values
  ('instagram','curtir_publicacao','Curtida no Instagram',0.10::numeric,'avaliacao_interna'),
  ('site','visitar_pagina','Visita ao site',0.30::numeric,'link_rastreado'),
  ('youtube','assistir_video','Visualização no YouTube',0.50::numeric,'codigo_no_conteudo')
) as seed(canal, acao, nome, valor, metodo)
join public.canais c on c.slug = seed.canal
on conflict (canal_id, acao) do update
set nome = excluded.nome,
    valor_validador = excluded.valor_validador,
    metodo_verificacao = excluded.metodo_verificacao;

-- Exemplos visuais identificados como demonstração. A Fase 6 os substituirá
-- por tarefas vinculadas a publicações reais dos Anunciantes.
insert into public.tarefas (
  tipo_tarefa_id, categoria_id, vagas, vagas_ocupadas, link_destino,
  tempo_estimado_minutos, status, is_demo
)
select tt.id, cat.id, 20, 0, 'https://example.com', 2, 'ativa', true
from public.tipos_tarefa tt
cross join public.categorias cat
where cat.ativa = true
  and tt.acao in ('curtir_publicacao','visitar_pagina','assistir_video')
  and not exists (
    select 1 from public.tarefas t
    where t.tipo_tarefa_id = tt.id
      and t.categoria_id = cat.id
      and t.is_demo = true
  );

-- Expira habilitacoes em ordem consistente de bloqueio, devolvendo vagas
-- sem permitir que o cliente altere diretamente status ou contadores.
create or replace function private.expirar_habilitacoes_validador()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tarefa_id uuid;
  v_expiradas integer;
  v_total integer := 0;
begin
  for v_tarefa_id in
    select distinct h.tarefa_id
    from public.habilitacoes h
    where h.status in ('habilitado','em_andamento')
      and h.expira_em <= now()
    order by h.tarefa_id
  loop
    perform 1 from public.tarefas where id = v_tarefa_id for update;

    update public.habilitacoes
    set status = 'expirada', atualizado_em = now()
    where tarefa_id = v_tarefa_id
      and status in ('habilitado','em_andamento')
      and expira_em <= now();

    get diagnostics v_expiradas = row_count;
    if v_expiradas > 0 then
      update public.tarefas
      set vagas_ocupadas = greatest(vagas_ocupadas - v_expiradas, 0),
          atualizado_em = now()
      where id = v_tarefa_id;
      v_total := v_total + v_expiradas;
    end if;
  end loop;

  return v_total;
end;
$$;

revoke all on function private.expirar_habilitacoes_validador() from public, anon, authenticated;

create or replace function public.processar_habilitacoes_expiradas()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null
    or not (
      (select private.has_role('validador'::app_role))
      or (select private.has_role('admin'::app_role))
    ) then
    raise exception 'Acesso restrito a Validadores e Admin.';
  end if;
  return private.expirar_habilitacoes_validador();
end;
$$;

revoke all on function public.processar_habilitacoes_expiradas() from public, anon;
grant execute on function public.processar_habilitacoes_expiradas() to authenticated;

create or replace function public.habilitar_tarefa(p_tarefa_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tarefa public.tarefas;
  v_handle text;
  v_habilitacao_id uuid;
  v_prazo integer;
begin
  if v_user_id is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem se habilitar.';
  end if;

  perform private.expirar_habilitacoes_validador();

  if not exists (select 1 from public.aceites_contrato where usuario_id = v_user_id)
    or not exists (
      select 1 from public.cadastro_validadores
      where usuario_id = v_user_id
        and maior_de_18 = true
        and consentimento_lgpd_interesses = true
    )
    or not exists (
      select 1 from public.documentos_usuarios
      where usuario_id = v_user_id and tipo_documento = 'cpf'
    )
    or (select count(*) from public.interesses_validador where usuario_id = v_user_id) not between 3 and 8
    or not exists (
      select 1 from public.contas_pix where usuario_id = v_user_id and aprovado = true
    )
    or not exists (
      select 1 from public.contas_sociais
      where usuario_id = v_user_id and canal = 'instagram' and status = 'aprovada'
    ) then
    raise exception 'Seu cadastro ainda nao esta aprovado. Conclua contrato, interesses, Pix e Instagram.';
  end if;

  select handle into v_handle
  from public.contas_sociais
  where usuario_id = v_user_id and canal = 'instagram' and status = 'aprovada';

  select * into v_tarefa
  from public.tarefas
  where id = p_tarefa_id and status = 'ativa'
  for update;

  if v_tarefa.id is null then
    raise exception 'Tarefa indisponivel.';
  end if;

  if not exists (
    select 1 from public.interesses_validador
    where usuario_id = v_user_id and categoria_id = v_tarefa.categoria_id
  ) then
    raise exception 'Esta tarefa nao corresponde aos seus interesses.';
  end if;

  select id into v_habilitacao_id
  from public.habilitacoes
  where tarefa_id = p_tarefa_id
    and validador_id = v_user_id
    and status in ('habilitado','em_andamento')
  limit 1;

  if v_habilitacao_id is not null then
    return v_habilitacao_id;
  end if;

  if v_tarefa.vagas_ocupadas >= v_tarefa.vagas then
    raise exception 'As vagas desta tarefa foram preenchidas.';
  end if;

  v_prazo := greatest(1, least(coalesce((
    select valor::integer from public.configuracoes where chave = 'prazo_habilitacao_horas'
  ), 2), 168));

  insert into public.habilitacoes (tarefa_id, validador_id, handle, status, expira_em)
  values (p_tarefa_id, v_user_id, v_handle, 'habilitado', now() + make_interval(hours => v_prazo))
  returning id into v_habilitacao_id;

  update public.tarefas
  set vagas_ocupadas = vagas_ocupadas + 1, atualizado_em = now()
  where id = p_tarefa_id;

  return v_habilitacao_id;
end;
$$;

revoke all on function public.habilitar_tarefa(uuid) from public, anon;
grant execute on function public.habilitar_tarefa(uuid) to authenticated;

create or replace function public.desistir_habilitacao(p_habilitacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tarefa_id uuid;
begin
  if v_user_id is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem desistir.';
  end if;

  perform private.expirar_habilitacoes_validador();

  select tarefa_id into v_tarefa_id
  from public.habilitacoes
  where id = p_habilitacao_id and validador_id = v_user_id;

  if v_tarefa_id is null then
    raise exception 'Habilitacao nao encontrada.';
  end if;

  perform 1 from public.tarefas where id = v_tarefa_id for update;

  update public.habilitacoes
  set status = 'desistiu', atualizado_em = now()
  where id = p_habilitacao_id
    and validador_id = v_user_id
    and status in ('habilitado','em_andamento');

  if not found then
    raise exception 'Esta habilitacao nao esta mais ativa.';
  end if;

  update public.tarefas
  set vagas_ocupadas = greatest(vagas_ocupadas - 1, 0), atualizado_em = now()
  where id = v_tarefa_id;
end;
$$;

revoke all on function public.desistir_habilitacao(uuid) from public, anon;
grant execute on function public.desistir_habilitacao(uuid) to authenticated;

create or replace function public.atualizar_interesses_validador(p_categoria_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_quantidade integer;
begin
  if v_user_id is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem editar interesses.';
  end if;

  select count(distinct id) into v_quantidade
  from unnest(coalesce(p_categoria_ids, array[]::uuid[])) as ids(id);

  if v_quantidade not between 3 and 8 then
    raise exception 'Selecione de 3 a 8 interesses.';
  end if;

  if exists (
    select 1
    from unnest(p_categoria_ids) as ids(id)
    left join public.categorias c on c.id = ids.id and c.ativa = true
    where c.id is null
  ) then
    raise exception 'Uma ou mais categorias nao estao disponiveis.';
  end if;

  delete from public.interesses_validador where usuario_id = v_user_id;
  insert into public.interesses_validador (usuario_id, categoria_id)
  select v_user_id, ids.id
  from (select distinct unnest(p_categoria_ids) as id) ids;

  return v_quantidade;
end;
$$;

revoke all on function public.atualizar_interesses_validador(uuid[]) from public, anon;
grant execute on function public.atualizar_interesses_validador(uuid[]) to authenticated;

-- A consulta e habilitacao acionam a expiracao sob demanda. Se pg_cron estiver
-- habilitado no projeto, o agendamento abaixo tambem libera vagas em segundo plano.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $schedule$
      select cron.schedule(
        'tarefa-play-expirar-habilitacoes',
        '* * * * *',
        'select private.expirar_habilitacoes_validador()'
      )
    $schedule$;
  end if;
exception when others then
  raise notice 'Agendamento pg_cron nao criado; a expiracao sob demanda continua habilitada: %', sqlerrm;
end;
$$;
