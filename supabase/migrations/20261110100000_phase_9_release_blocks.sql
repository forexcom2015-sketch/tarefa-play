-- Fase 9: liberação cíclica, contadores diários, bloqueios, contestação e limites.
-- Aplicação manual no Supabase externo; não aplicar automaticamente em produção.

create table if not exists public.regras_liberacao (
  id uuid primary key default gen_random_uuid(),
  tipo_origem_id uuid not null references public.tipos_tarefa(id) on delete restrict,
  quantidade_requisito integer not null check (quantidade_requisito > 0),
  tipo_destino_id uuid not null references public.tipos_tarefa(id) on delete restrict,
  quantidade_liberada integer not null check (quantidade_liberada > 0),
  ciclica boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tipo_origem_id, tipo_destino_id)
);

create table if not exists public.validador_contadores_diarios (
  id uuid primary key default gen_random_uuid(),
  validador_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  canal_id uuid not null references public.canais(id) on delete restrict,
  tarefas_concluidas integer not null default 0 check (tarefas_concluidas >= 0),
  creditos_liberados integer not null default 0 check (creditos_liberados >= 0),
  creditos_consumidos integer not null default 0 check (creditos_consumidos >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (validador_id, dia, canal_id)
);

create table if not exists public.habilitacoes_contabilizadas (
  habilitacao_id uuid primary key references public.habilitacoes(id) on delete cascade,
  validador_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  canal_id uuid not null references public.canais(id) on delete restrict,
  contabilizada_em timestamptz not null default now()
);

create table if not exists public.bloqueios (
  id uuid primary key default gen_random_uuid(),
  validador_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null,
  inicio timestamptz not null default now(),
  fim timestamptz not null,
  contestado boolean not null default false,
  origem text not null default 'admin' check (origem in ('minimo_diario','velocidade','admin','habilitacao_expirada')),
  status text not null default 'ativo' check (status in ('ativo','contestado','revertido','expirado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.contestacoes_bloqueio (
  id uuid primary key default gen_random_uuid(),
  bloqueio_id uuid not null references public.bloqueios(id) on delete cascade,
  validador_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (length(trim(texto)) between 10 and 2000),
  status text not null default 'aberta' check (status in ('aberta','aceita','negada')),
  decisor uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  decidido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (bloqueio_id)
);

alter table public.habilitacoes add column if not exists dispositivo_id text;

create index if not exists validador_contadores_diarios_lookup_idx
  on public.validador_contadores_diarios (validador_id, dia, canal_id);
create index if not exists habilitacoes_contabilizadas_validador_dia_idx
  on public.habilitacoes_contabilizadas (validador_id, dia, canal_id);
create index if not exists bloqueios_validador_status_idx
  on public.bloqueios (validador_id, status, fim desc);
create index if not exists contestacoes_bloqueio_status_idx
  on public.contestacoes_bloqueio (status, criado_em desc);
create index if not exists habilitacoes_validador_hora_idx
  on public.habilitacoes (validador_id, criado_em desc);
create index if not exists habilitacoes_dispositivo_hora_idx
  on public.habilitacoes (dispositivo_id, criado_em desc) where dispositivo_id is not null;

alter table public.regras_liberacao enable row level security;
alter table public.validador_contadores_diarios enable row level security;
alter table public.habilitacoes_contabilizadas enable row level security;
alter table public.bloqueios enable row level security;
alter table public.contestacoes_bloqueio enable row level security;

revoke all on public.regras_liberacao, public.validador_contadores_diarios,
  public.habilitacoes_contabilizadas, public.bloqueios, public.contestacoes_bloqueio
  from anon, authenticated;
grant select on public.regras_liberacao, public.validador_contadores_diarios,
  public.bloqueios, public.contestacoes_bloqueio to authenticated;

drop policy if exists regras_liberacao_select_authenticated on public.regras_liberacao;
create policy regras_liberacao_select_authenticated on public.regras_liberacao
for select to authenticated
using (ativo or (select private.has_role('admin'::app_role)));

drop policy if exists regras_liberacao_admin_manage on public.regras_liberacao;
create policy regras_liberacao_admin_manage on public.regras_liberacao
for all to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

drop policy if exists validador_contadores_diarios_select_owner_admin on public.validador_contadores_diarios;
create policy validador_contadores_diarios_select_owner_admin on public.validador_contadores_diarios
for select to authenticated
using (validador_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

drop policy if exists bloqueios_select_owner_admin on public.bloqueios;
create policy bloqueios_select_owner_admin on public.bloqueios
for select to authenticated
using (validador_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

drop policy if exists contestacoes_select_owner_admin on public.contestacoes_bloqueio;
create policy contestacoes_select_owner_admin on public.contestacoes_bloqueio
for select to authenticated
using (validador_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

insert into public.regras_liberacao
  (tipo_origem_id, quantidade_requisito, tipo_destino_id, quantidade_liberada, ciclica, ativo)
select origem.id, seed.requisito, destino.id, seed.liberada, true, true
from (values
  ('instagram','curtir_publicacao','site','visitar_pagina',10,5),
  ('site','visitar_pagina','youtube','assistir_video',5,2)
) as seed(origem_canal, origem_acao, destino_canal, destino_acao, requisito, liberada)
join public.canais co on co.slug = seed.origem_canal
join public.tipos_tarefa origem on origem.canal_id = co.id and origem.acao = seed.origem_acao
join public.canais cd on cd.slug = seed.destino_canal
join public.tipos_tarefa destino on destino.canal_id = cd.id and destino.acao = seed.destino_acao
on conflict (tipo_origem_id, tipo_destino_id) do update
set quantidade_requisito = excluded.quantidade_requisito,
    quantidade_liberada = excluded.quantidade_liberada,
    ciclica = excluded.ciclica,
    ativo = true,
    atualizado_em = now();

create or replace function public.registrar_habilitacao_validada_fase9()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_canal_id uuid;
  v_dia date;
begin
  if new.status <> 'validada' or old.status = 'validada' or new.validada_em is null then
    return new;
  end if;
  select tt.canal_id into v_canal_id
  from public.tarefas t
  join public.tipos_tarefa tt on tt.id = t.tipo_tarefa_id
  where t.id = new.tarefa_id;
  if v_canal_id is null then return new; end if;
  v_dia := (new.validada_em at time zone 'America/Sao_Paulo')::date;

  insert into public.habilitacoes_contabilizadas(habilitacao_id,validador_id,dia,canal_id)
  values(new.id,new.validador_id,v_dia,v_canal_id)
  on conflict (habilitacao_id) do nothing;

  if found then
    insert into public.validador_contadores_diarios
      (validador_id,dia,canal_id,tarefas_concluidas)
    values(new.validador_id,v_dia,v_canal_id,1)
    on conflict (validador_id,dia,canal_id) do update
      set tarefas_concluidas = public.validador_contadores_diarios.tarefas_concluidas + 1,
          atualizado_em = now();

    insert into public.validador_contadores_diarios
      (validador_id,dia,canal_id,tarefas_concluidas,creditos_liberados,creditos_consumidos)
    select new.validador_id,v_dia,c.id,0,
      case when c.slug='site' then floor(coalesce((
        select sum(x.tarefas_concluidas)
        from public.validador_contadores_diarios x
        join public.canais xi on xi.id=x.canal_id
        where x.validador_id=new.validador_id and x.dia=v_dia and xi.slug='instagram'
      ),0)::numeric/10)*5
      when c.slug='youtube' then floor(coalesce((
        select sum(x.tarefas_concluidas)
        from public.validador_contadores_diarios x
        join public.canais xi on xi.id=x.canal_id
        where x.validador_id=new.validador_id and x.dia=v_dia and xi.slug='site'
      ),0)::numeric/5)*2 else 0 end,
      case when c.slug in ('site','youtube') then coalesce((
        select sum(x.tarefas_concluidas)
        from public.validador_contadores_diarios x
        join public.canais xi on xi.id=x.canal_id
        where x.validador_id=new.validador_id and x.dia=v_dia and xi.slug=c.slug
      ),0) else 0 end
    from public.canais c
    where c.slug in ('site','youtube')
    on conflict (validador_id,dia,canal_id) do update
      set creditos_liberados=excluded.creditos_liberados,
          creditos_consumidos=excluded.creditos_consumidos,
          atualizado_em=now();
  end if;
  return new;
end;
$function$;

revoke all on function public.registrar_habilitacao_validada_fase9() from public, anon, authenticated, service_role;
drop trigger if exists contabilizar_habilitacao_validada_fase9 on public.habilitacoes;
create trigger contabilizar_habilitacao_validada_fase9
after update of status, validada_em on public.habilitacoes
for each row execute function public.registrar_habilitacao_validada_fase9();

create or replace function public.obter_status_liberacao_fase9()
returns table(canal text,tarefas_concluidas integer,creditos_disponiveis integer,proxima_liberacao_em text,mensagem text)
language plpgsql security definer set search_path=''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_dia date := ((now() at time zone 'America/Sao_Paulo')::date);
  v_i integer := 0; v_s integer := 0; v_y integer := 0;
  v_ciclica boolean := true;
begin
  if v_user is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem consultar a liberação.';
  end if;
  select coalesce(c.valor::boolean,true) into v_ciclica from public.configuracoes c where c.chave='liberacao_ciclica';
  select coalesce(sum(x.tarefas_concluidas),0)::integer into v_i
    from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id
    where x.validador_id=v_user and x.dia=v_dia and c.slug='instagram';
  select coalesce(sum(x.tarefas_concluidas),0)::integer into v_s
    from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id
    where x.validador_id=v_user and x.dia=v_dia and c.slug='site';
  select coalesce(sum(x.tarefas_concluidas),0)::integer into v_y
    from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id
    where x.validador_id=v_user and x.dia=v_dia and c.slug='youtube';
  if not v_ciclica then
    return query select 'Instagram',v_i,0,'','Liberação cíclica desativada.';
    return query select 'Site',v_s,0,'','Liberação cíclica desativada.';
    return query select 'YouTube',v_y,0,'','Liberação cíclica desativada.';
    return;
  end if;
  return query select 'Instagram',v_i,0,'',case when v_i<10 then format('Faça mais %s tarefas de Instagram para liberar 5 visitas a sites.',10-v_i) else format('Você já liberou %s visitas a sites neste dia.',floor(v_i::numeric/10)*5) end;
  return query select 'Site',v_s,greatest(floor(v_i::numeric/10)*5-v_s,0)::integer,'',case when greatest(floor(v_i::numeric/10)*5-v_s,0)>0 then format('Você tem %s visitas a sites liberadas.',greatest(floor(v_i::numeric/10)*5-v_s,0)) when v_i<10 then format('Faça mais %s tarefas de Instagram para liberar 5 visitas a sites.',10-v_i) else 'Nenhuma visita a site liberada no momento.' end;
  return query select 'YouTube',v_y,greatest(floor(v_s::numeric/5)*2-v_y,0)::integer,'',case when greatest(floor(v_s::numeric/5)*2-v_y,0)>0 then format('Você tem %s tarefas de YouTube liberadas.',greatest(floor(v_s::numeric/5)*2-v_y,0)) when v_s<5 then format('Faça mais %s visitas a sites para liberar 2 tarefas de YouTube.',5-v_s) else 'Nenhuma tarefa de YouTube liberada no momento.' end;
end;
$function$;

revoke all on function public.obter_status_liberacao_fase9() from public, anon;
grant execute on function public.obter_status_liberacao_fase9() to authenticated;

drop function if exists public.habilitar_tarefa(uuid);
create or replace function public.habilitar_tarefa(p_tarefa_id uuid,p_dispositivo_id text)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_tarefa public.tarefas;
  v_handle text;
  v_hab uuid;
  v_prazo integer;
  v_canal text;
  v_bloqueio_fim timestamptz;
  v_limite integer;
  v_limite_disp integer;
  v_count integer;
  v_count_disp integer;
  v_i integer := 0;
  v_s integer := 0;
  v_y integer := 0;
  v_credit_s integer;
  v_credit_y integer;
  v_ciclica boolean := true;
begin
  if v_user is null or not (select private.has_role('validador'::app_role)) then raise exception 'Somente Validadores autenticados podem se habilitar.'; end if;
  if p_dispositivo_id is null or length(trim(p_dispositivo_id)) < 8 or length(trim(p_dispositivo_id)) > 128 then raise exception 'Identificador de dispositivo inválido.'; end if;

  select b.fim into v_bloqueio_fim from public.bloqueios b
    where b.validador_id=v_user and b.status in ('ativo','contestado') and b.fim>now()
    order by b.fim desc limit 1;
  if v_bloqueio_fim is not null then
    raise exception 'Você está bloqueado para novas tarefas até %.',to_char(v_bloqueio_fim at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI');
  end if;

  select coalesce(c.valor::integer,20) into v_limite from public.configuracoes c where c.chave='limite_tarefas_hora_validador';
  select coalesce(c.valor::integer,10) into v_limite_disp from public.configuracoes c where c.chave='limite_tarefas_hora_dispositivo';
  if v_limite>0 then
    select count(*)::integer into v_count from public.habilitacoes h where h.validador_id=v_user and h.criado_em>=now()-interval '1 hour';
    if v_count>=v_limite then
      insert into public.auditoria(usuario_id,acao,entidade,dados) values(v_user,'limite_velocidade_excedido','bloqueios',jsonb_build_object('origem','velocidade','limite','validador'));
      raise exception 'Limite de tarefas por hora atingido. Tente novamente mais tarde.';
    end if;
  end if;
  if v_limite_disp>0 then
    select count(*)::integer into v_count_disp from public.habilitacoes h
      where h.validador_id=v_user and h.criado_em>=now()-interval '1 hour' and lower(coalesce(h.dispositivo_id,''))=lower(trim(p_dispositivo_id));
    if v_count_disp>=v_limite_disp then
      insert into public.auditoria(usuario_id,acao,entidade,dados) values(v_user,'limite_velocidade_excedido','bloqueios',jsonb_build_object('origem','velocidade','limite','dispositivo'));
      raise exception 'Limite de tarefas por dispositivo atingido. Tente novamente mais tarde.';
    end if;
  end if;

  perform private.expirar_habilitacoes_validador();

  if not exists(select 1 from public.aceites_contrato where usuario_id=v_user)
    or not exists(select 1 from public.cadastro_validadores where usuario_id=v_user and maior_de_18=true and consentimento_lgpd_interesses=true)
    or not exists(select 1 from public.documentos_usuarios where usuario_id=v_user and tipo_documento='cpf')
    or (select count(*) from public.interesses_validador where usuario_id=v_user) not between 3 and 8
    or not exists(select 1 from public.contas_pix where usuario_id=v_user and aprovado=true)
    or not exists(select 1 from public.contas_sociais where usuario_id=v_user and canal='instagram' and status='aprovada') then
    raise exception 'Seu cadastro ainda não está aprovado. Conclua contrato, interesses, Pix e Instagram.';
  end if;

  select cs.handle into v_handle from public.contas_sociais cs where cs.usuario_id=v_user and cs.canal='instagram' and cs.status='aprovada';
  select t.* into v_tarefa from public.tarefas t where t.id=p_tarefa_id and t.status='ativa' for update;
  if v_tarefa.id is null then raise exception 'Tarefa indisponível.'; end if;
  if exists(select 1 from public.publicacoes p where p.id=v_tarefa.publicacao_id and p.anunciante_id=v_user) then raise exception 'Você não pode se habilitar na própria tarefa.'; end if;
  if not exists(select 1 from public.interesses_validador i where i.usuario_id=v_user and i.categoria_id=v_tarefa.categoria_id) then raise exception 'Esta tarefa não corresponde aos seus interesses.'; end if;

  select c.slug into v_canal from public.tipos_tarefa tt join public.canais c on c.id=tt.canal_id where tt.id=v_tarefa.tipo_tarefa_id;
  select coalesce(c.valor::boolean,true) into v_ciclica from public.configuracoes c where c.chave='liberacao_ciclica';
  if v_ciclica and v_canal<>'instagram' then
    select coalesce(sum(x.tarefas_concluidas),0)::integer into v_i from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id where x.validador_id=v_user and x.dia=((now() at time zone 'America/Sao_Paulo')::date) and c.slug='instagram';
    select coalesce(sum(x.tarefas_concluidas),0)::integer into v_s from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id where x.validador_id=v_user and x.dia=((now() at time zone 'America/Sao_Paulo')::date) and c.slug='site';
    select coalesce(sum(x.tarefas_concluidas),0)::integer into v_y from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id where x.validador_id=v_user and x.dia=((now() at time zone 'America/Sao_Paulo')::date) and c.slug='youtube';
    v_credit_s:=greatest(floor(v_i::numeric/10)*5-v_s,0)::integer;
    v_credit_y:=greatest(floor(v_s::numeric/5)*2-v_y,0)::integer;
    if v_canal='site' and v_credit_s<=0 then raise exception 'Ainda não há crédito para visitas a sites. Faça mais % tarefas de Instagram para liberar 5 visitas a sites.',greatest(10-v_i,0); end if;
    if v_canal='youtube' and v_credit_y<=0 then raise exception 'Ainda não há crédito para tarefas de YouTube. Faça mais % visitas a sites para liberar 2 tarefas de YouTube.',greatest(5-v_s,0); end if;
  end if;

  v_prazo:=greatest(1,least(coalesce((select c.valor::integer from public.configuracoes c where c.chave='prazo_habilitacao_horas'),2),168));
  select h.id into v_hab from public.habilitacoes h where h.tarefa_id=p_tarefa_id and h.validador_id=v_user and h.status in ('habilitado','em_andamento') limit 1;
  if v_hab is not null then return v_hab; end if;
  if v_tarefa.vagas_ocupadas>=v_tarefa.vagas then raise exception 'As vagas desta tarefa foram preenchidas.'; end if;

  insert into public.habilitacoes(tarefa_id,validador_id,handle,status,expira_em,dispositivo_id)
  values(p_tarefa_id,v_user,v_handle,'habilitado',now()+make_interval(hours=>v_prazo),lower(trim(p_dispositivo_id)))
  returning id into v_hab;
  update public.tarefas set vagas_ocupadas=vagas_ocupadas+1,atualizado_em=now() where id=p_tarefa_id;
  return v_hab;
end;
$function$;

revoke all on function public.habilitar_tarefa(uuid,text) from public, anon;
grant execute on function public.habilitar_tarefa(uuid,text) to authenticated;

create or replace function public.processar_bloqueios_diarios()
returns integer language plpgsql security definer set search_path=''
as $function$
declare
  v_dia date:=((now() at time zone 'America/Sao_Paulo')::date-1);
  v_min integer; v_horas integer; v_ativo boolean; v_user uuid; v_i integer; v_existe boolean; v_id uuid; v_total integer:=0;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Rotina restrita ao service_role.'; end if;
  select coalesce(c.valor::integer,10) into v_min from public.configuracoes c where c.chave='minimo_diario_instagram';
  select coalesce(c.valor::integer,24) into v_horas from public.configuracoes c where c.chave='bloqueio_horas';
  select coalesce(c.valor::boolean,true) into v_ativo from public.configuracoes c where c.chave='bloqueio_por_minimo_ativo';
  if not v_ativo then return 0; end if;

  for v_user in select user_id from public.user_roles where role='validador'::public.app_role loop
    select coalesce(sum(x.tarefas_concluidas),0)::integer into v_i
      from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id
      where x.validador_id=v_user and x.dia=v_dia and c.slug='instagram';
    if v_i>=v_min then continue; end if;
    select exists(
      select 1 from public.tarefas t
      join public.tipos_tarefa tt on tt.id=t.tipo_tarefa_id
      join public.canais c on c.id=tt.canal_id
      where t.status='ativa' and t.is_demo=false and c.slug='instagram'
        and exists(select 1 from public.interesses_validador i where i.usuario_id=v_user and i.categoria_id=t.categoria_id)
    ) into v_existe;
    if not v_existe then continue; end if;
    if exists(select 1 from public.bloqueios b where b.validador_id=v_user and b.origem='minimo_diario' and (b.criado_em at time zone 'America/Sao_Paulo')::date=v_dia) then continue; end if;
    insert into public.bloqueios(validador_id,motivo,inicio,fim,origem,status)
      values(v_user,format('Mínimo diário de Instagram não cumprido: %s de %s tarefas validadas.',v_i,v_min),now(),now()+make_interval(hours=>v_horas),'minimo_diario','ativo')
      returning id into v_id;
    insert into public.auditoria(usuario_id,acao,entidade,dados)
      values(v_user,'bloqueio_minimo_diario','bloqueios',jsonb_build_object('bloqueio_id',v_id,'dia',v_dia,'tarefas_instagram',v_i,'minimo',v_min));
    v_total:=v_total+1;
  end loop;
  return v_total;
end;
$function$;
revoke all on function public.processar_bloqueios_diarios() from public, anon, authenticated;
grant execute on function public.processar_bloqueios_diarios() to service_role;

create or replace function public.processar_bloqueios_habilitacoes_expiradas()
returns integer language plpgsql security definer set search_path=''
as $function$
declare r record; v_horas integer; v_id uuid; v_total integer:=0;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Rotina restrita ao service_role.'; end if;
  select coalesce(c.valor::integer,24) into v_horas from public.configuracoes c where c.chave='bloqueio_horas';
  for r in
    select h.id,h.validador_id,tt.metodo_verificacao,
      exists(select 1 from public.tokens_tarefa tok where tok.habilitacao_id=h.id and tok.criado_em<=h.expira_em) as token_recebido
    from public.habilitacoes h
    join public.tarefas t on t.id=h.tarefa_id
    join public.tipos_tarefa tt on tt.id=t.tipo_tarefa_id
    where h.status='expirada' and h.expira_em<=now()
      and not exists(select 1 from public.bloqueios b where b.validador_id=h.validador_id and b.origem='habilitacao_expirada' and b.motivo like '%'||h.id::text||'%')
  loop
    if r.metodo_verificacao='token_lista' and not r.token_recebido then continue; end if;
    insert into public.bloqueios(validador_id,motivo,inicio,fim,origem,status)
      values(r.validador_id,format('Habilitação %s expirou sem execução no prazo.',r.id),now(),now()+make_interval(hours=>v_horas),'habilitacao_expirada','ativo')
      returning id into v_id;
    insert into public.auditoria(usuario_id,acao,entidade,dados)
      values(r.validador_id,'bloqueio_habilitacao_expirada','bloqueios',jsonb_build_object('bloqueio_id',v_id,'habilitacao_id',r.id,'token_recebido',r.token_recebido));
    v_total:=v_total+1;
  end loop;
  return v_total;
end;
$function$;
revoke all on function public.processar_bloqueios_habilitacoes_expiradas() from public, anon, authenticated;
grant execute on function public.processar_bloqueios_habilitacoes_expiradas() to service_role;

create or replace function public.contestar_bloqueio(p_bloqueio_id uuid,p_texto text)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_fim timestamptz; v_id uuid;
begin
  if v_user is null or not (select private.has_role('validador'::app_role)) then raise exception 'Somente Validadores podem contestar bloqueios.'; end if;
  if p_texto is null or length(trim(p_texto)) not between 10 and 2000 then raise exception 'A contestação deve ter entre 10 e 2000 caracteres.'; end if;
  select fim into v_fim from public.bloqueios where id=p_bloqueio_id and validador_id=v_user and status in ('ativo','contestado');
  if v_fim is null or v_fim<=now() then raise exception 'Bloqueio não encontrado ou já encerrado.'; end if;
  if exists(select 1 from public.contestacoes_bloqueio where bloqueio_id=p_bloqueio_id) then raise exception 'Este bloqueio já possui contestação.'; end if;
  insert into public.contestacoes_bloqueio(bloqueio_id,validador_id,texto) values(p_bloqueio_id,v_user,trim(p_texto)) returning id into v_id;
  update public.bloqueios set contestado=true,status='contestado',atualizado_em=now() where id=p_bloqueio_id;
  insert into public.auditoria(usuario_id,acao,entidade,dados) values(v_user,'contestacao_bloqueio_aberta','contestacoes_bloqueio',jsonb_build_object('contestacao_id',v_id,'bloqueio_id',p_bloqueio_id));
  return v_id;
end;
$function$;
revoke all on function public.contestar_bloqueio(uuid,text) from public, anon;
grant execute on function public.contestar_bloqueio(uuid,text) to authenticated;

create or replace function public.decidir_contestacao_bloqueio(p_contestacao_id uuid,p_decisao text)
returns void language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_bloqueio uuid; v_status text;
begin
  if v_user is null or not (select private.has_role('admin'::app_role)) then raise exception 'Somente Admin pode decidir contestações.'; end if;
  if p_decisao not in ('aceita','negada') then raise exception 'Decisão inválida.'; end if;
  select bloqueio_id,status into v_bloqueio,v_status from public.contestacoes_bloqueio where id=p_contestacao_id for update;
  if v_bloqueio is null then raise exception 'Contestação não encontrada.'; end if;
  if v_status<>'aberta' then raise exception 'Esta contestação já foi decidida.'; end if;
  update public.contestacoes_bloqueio set status=p_decisao,decisor=v_user,decidido_em=now(),atualizado_em=now() where id=p_contestacao_id;
  if p_decisao='aceita' then
    update public.bloqueios set status='revertido',fim=least(fim,now()),atualizado_em=now() where id=v_bloqueio;
  else
    update public.bloqueios set status='ativo',atualizado_em=now() where id=v_bloqueio and fim>now();
  end if;
  insert into public.auditoria(usuario_id,acao,entidade,dados)
    values(v_user,'contestacao_bloqueio_decidida','contestacoes_bloqueio',jsonb_build_object('contestacao_id',p_contestacao_id,'bloqueio_id',v_bloqueio,'decisao',p_decisao));
end;
$function$;
revoke all on function public.decidir_contestacao_bloqueio(uuid,text) from public, anon;
grant execute on function public.decidir_contestacao_bloqueio(uuid,text) to authenticated;

create or replace function public.salvar_regra_liberacao(p_id uuid,p_tipo_origem_id uuid,p_quantidade_requisito integer,p_tipo_destino_id uuid,p_quantidade_liberada integer,p_ciclica boolean,p_ativo boolean)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=(select auth.uid()); v_id uuid;
begin
  if v_user is null or not (select private.has_role('admin'::app_role)) then raise exception 'Somente Admin pode editar regras de liberação.'; end if;
  if p_quantidade_requisito<1 or p_quantidade_liberada<1 then raise exception 'As quantidades devem ser maiores que zero.'; end if;
  if p_id is null then
    insert into public.regras_liberacao(tipo_origem_id,quantidade_requisito,tipo_destino_id,quantidade_liberada,ciclica,ativo)
    values(p_tipo_origem_id,p_quantidade_requisito,p_tipo_destino_id,p_quantidade_liberada,p_ciclica,p_ativo) returning id into v_id;
  else
    update public.regras_liberacao set tipo_origem_id=p_tipo_origem_id,quantidade_requisito=p_quantidade_requisito,tipo_destino_id=p_tipo_destino_id,quantidade_liberada=p_quantidade_liberada,ciclica=p_ciclica,ativo=p_ativo,atualizado_em=now()
    where id=p_id returning id into v_id;
  end if;
  if v_id is null then raise exception 'Regra de liberação não encontrada.'; end if;
  insert into public.auditoria(usuario_id,acao,entidade,dados)
    values(v_user,case when p_id is null then 'regra_liberacao_criada' else 'regra_liberacao_atualizada' end,'regras_liberacao',
      jsonb_build_object('regra_id',v_id,'tipo_origem_id',p_tipo_origem_id,'quantidade_requisito',p_quantidade_requisito,'tipo_destino_id',p_tipo_destino_id,'quantidade_liberada',p_quantidade_liberada,'ciclica',p_ciclica,'ativo',p_ativo));
  return v_id;
end;
$function$;
revoke all on function public.salvar_regra_liberacao(uuid,uuid,integer,uuid,integer,boolean,boolean) from public, anon;
grant execute on function public.salvar_regra_liberacao(uuid,uuid,integer,uuid,integer,boolean,boolean) to authenticated;

insert into public.configuracoes(chave,valor,descricao)
values
 ('limite_tarefas_hora_validador','20','Limite de novas habilitações por Validador em uma janela móvel de 1 hora.'),
 ('limite_tarefas_hora_dispositivo','10','Limite de novas habilitações por identificador de dispositivo em uma janela móvel de 1 hora.')
on conflict (chave) do nothing;

create or replace function public.auditar_regras_liberacao_fase9()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  insert into public.auditoria(usuario_id,acao,entidade,dados)
  values((select auth.uid()),tg_op,'regras_liberacao',
    jsonb_build_object('antes',case when tg_op<>'INSERT' then to_jsonb(old) end,'depois',case when tg_op<>'DELETE' then to_jsonb(new) end));
  return coalesce(new,old);
end;
$function$;
revoke all on function public.auditar_regras_liberacao_fase9() from public, anon, authenticated, service_role;
drop trigger if exists auditoria_regras_liberacao_fase9 on public.regras_liberacao;
create trigger auditoria_regras_liberacao_fase9
after insert or update or delete on public.regras_liberacao for each row
execute function public.auditar_regras_liberacao_fase9();

-- Agendamento: configurar estas duas rotinas no Supabase Cron ou worker externo
-- com service_role; a migration não cria cron automaticamente.
