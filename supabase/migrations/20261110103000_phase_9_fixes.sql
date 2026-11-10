-- Fase 9: correções antes do merge do PR #11.
alter table public.bloqueios add column if not exists dia_referencia date;

with ranked as (
  select id,row_number() over (
    partition by validador_id,origem,((criado_em at time zone 'America/Sao_Paulo')::date)
    order by criado_em desc,id desc) rn,
    ((criado_em at time zone 'America/Sao_Paulo')::date) dia
  from public.bloqueios where origem='minimo_diario'
)
update public.bloqueios b set dia_referencia=r.dia from ranked r
where b.id=r.id and r.rn=1 and b.dia_referencia is null;

create unique index if not exists bloqueios_minimo_diario_validador_dia_uidx
on public.bloqueios(validador_id,dia_referencia)
where origem='minimo_diario' and dia_referencia is not null;

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
    if exists(select 1 from public.bloqueios b where b.validador_id=v_user and b.origem='minimo_diario' and b.dia_referencia=v_dia) then continue; end if;
    insert into public.bloqueios(validador_id,motivo,inicio,fim,origem,status,dia_referencia)
      values(v_user,format('Mínimo diário de Instagram não cumprido: %s de %s tarefas validadas.',v_i,v_min),now(),now()+make_interval(hours=>v_horas),'minimo_diario','ativo',v_dia)
      returning id into v_id;
    insert into public.auditoria(usuario_id,acao,entidade,dados)
      values(v_user,'bloqueio_minimo_diario','bloqueios',jsonb_build_object('bloqueio_id',v_id,'dia',v_dia,'tarefas_instagram',v_i,'minimo',v_min));
    v_total:=v_total+1;
  end loop;
  return v_total;
end;
$function$;

create or replace function public.obter_status_liberacao_fase9()
returns table(canal text,tarefas_concluidas integer,creditos_disponiveis integer,proxima_liberacao_em text,mensagem text)
language plpgsql security definer set search_path=''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_dia date := ((now() at time zone 'America/Sao_Paulo')::date);
  v_i integer := 0; v_s integer := 0; v_y integer := 0;
  v_ciclica boolean := true;
  v_req_s integer; v_rel_s integer; v_cic_s boolean;
  v_req_y integer; v_rel_y integer; v_cic_y boolean;
  v_credit_s integer := 0; v_credit_y integer := 0;
begin
  if v_user is null or not (select private.has_role('validador'::public.app_role)) then
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
  select r.quantidade_requisito,r.quantidade_liberada,r.ciclica into v_req_s,v_rel_s,v_cic_s
  from public.regras_liberacao r join public.tipos_tarefa o on o.id=r.tipo_origem_id join public.canais co on co.id=o.canal_id
  join public.tipos_tarefa d on d.id=r.tipo_destino_id join public.canais cd on cd.id=d.canal_id
  where r.ativo and co.slug='instagram' and cd.slug='site' limit 1;
  select r.quantidade_requisito,r.quantidade_liberada,r.ciclica into v_req_y,v_rel_y,v_cic_y
  from public.regras_liberacao r join public.tipos_tarefa o on o.id=r.tipo_origem_id join public.canais co on co.id=o.canal_id
  join public.tipos_tarefa d on d.id=r.tipo_destino_id join public.canais cd on cd.id=d.canal_id
  where r.ativo and co.slug='site' and cd.slug='youtube' limit 1;
  if not v_ciclica then
    return query select 'Instagram',v_i,0,'','Liberação cíclica desativada.';
    return query select 'Site',v_s,0,'','Liberação cíclica desativada.';
    return query select 'YouTube',v_y,0,'','Liberação cíclica desativada.';
    return;
  end if;
  v_credit_s:=case when v_req_s is null or v_rel_s is null then 0 else greatest((case when v_cic_s then floor(v_i::numeric/v_req_s) else least(floor(v_i::numeric/v_req_s),1) end)*v_rel_s-v_s,0)::integer end;
  v_credit_y:=case when v_req_y is null or v_rel_y is null then 0 else greatest((case when v_cic_y then floor(v_s::numeric/v_req_y) else least(floor(v_s::numeric/v_req_y),1) end)*v_rel_y-v_y,0)::integer end;
  return query select 'Instagram',v_i,0,'',
    case when v_req_s is null then 'Nenhuma regra de liberação para o próximo nível.'
         when v_i<v_req_s then format('Faça mais %s tarefas de Instagram para liberar %s visitas a sites.',v_req_s-v_i,v_rel_s)
         else format('Faça mais %s tarefas de Instagram para liberar mais %s visitas a sites.',v_req_s,v_rel_s) end;
  return query select 'Site',v_s,v_credit_s,'',
    case when v_credit_s>0 then format('Você tem %s visitas a sites liberadas.',v_credit_s)
         when v_req_s is null then 'Nenhuma regra de liberação para visitas a sites.'
         when v_i<v_req_s then format('Faça mais %s tarefas de Instagram para liberar %s visitas a sites.',v_req_s-v_i,v_rel_s)
         else format('Faça mais %s tarefas de Instagram para liberar mais %s visitas a sites.',v_req_s,v_rel_s) end;
  return query select 'YouTube',v_y,v_credit_y,'',
    case when v_credit_y>0 then format('Você tem %s tarefas de YouTube liberadas.',v_credit_y)
         when v_req_y is null then 'Nenhuma regra de liberação para tarefas de YouTube.'
         when v_s<v_req_y then format('Faça mais %s visitas a sites para liberar %s tarefas de YouTube.',v_req_y-v_s,v_rel_y)
         else format('Faça mais %s visitas a sites para liberar mais %s tarefas de YouTube.',v_req_y,v_rel_y) end;
end;
$function$;

create or replace function public.registrar_habilitacao_validada_fase9()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_canal_id uuid;
  v_dia date;
  v_canal text; v_origem_canal text;
  v_requisito integer; v_liberada integer; v_ciclica_regra boolean;
  v_source_count integer; v_creditos integer; v_ciclica_global boolean := true; v_destino_id uuid;
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
    insert into public.validador_contadores_diarios(validador_id,dia,canal_id,tarefas_concluidas)
    values(new.validador_id,v_dia,v_canal_id,1)
    on conflict (validador_id,dia,canal_id) do update
      set tarefas_concluidas=public.validador_contadores_diarios.tarefas_concluidas+1,atualizado_em=now();

    select coalesce(c.valor::boolean,true) into v_ciclica_global from public.configuracoes c where c.chave='liberacao_ciclica';

    for v_canal in select unnest(array['site','youtube']) loop
      v_origem_canal:=case when v_canal='site' then 'instagram' else 'site' end;
      select r.quantidade_requisito,r.quantidade_liberada,r.ciclica into v_requisito,v_liberada,v_ciclica_regra
      from public.regras_liberacao r join public.tipos_tarefa o on o.id=r.tipo_origem_id join public.canais co on co.id=o.canal_id
      join public.tipos_tarefa d on d.id=r.tipo_destino_id join public.canais cd on cd.id=d.canal_id
      where r.ativo and co.slug=v_origem_canal and cd.slug=v_canal limit 1;
      select c.id into v_destino_id from public.canais c where c.slug=v_canal limit 1;
      v_creditos:=0;
      if v_ciclica_global and v_requisito is not null and v_liberada is not null and v_destino_id is not null then
        select coalesce(sum(x.tarefas_concluidas),0)::integer into v_source_count
        from public.validador_contadores_diarios x join public.canais c on c.id=x.canal_id
        where x.validador_id=new.validador_id and x.dia=v_dia and c.slug=v_origem_canal;
        v_creditos:=greatest((case when v_ciclica_regra then floor(v_source_count::numeric/v_requisito) else least(floor(v_source_count::numeric/v_requisito),1) end)*v_liberada
          -coalesce((select sum(x.tarefas_concluidas) from public.validador_contadores_diarios x where x.validador_id=new.validador_id and x.dia=v_dia and x.canal_id=v_destino_id),0),0)::integer;
      end if;
      insert into public.validador_contadores_diarios(validador_id,dia,canal_id,tarefas_concluidas,creditos_liberados,creditos_consumidos)
      values(new.validador_id,v_dia,v_destino_id,0,v_creditos,
        coalesce((select sum(x.tarefas_concluidas) from public.validador_contadores_diarios x where x.validador_id=new.validador_id and x.dia=v_dia and x.canal_id=v_destino_id),0))
      on conflict (validador_id,dia,canal_id) do update
        set creditos_liberados=excluded.creditos_liberados,creditos_consumidos=excluded.creditos_consumidos,atualizado_em=now();
    end loop;
  end if;
  return new;
end;
$function$;

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
  v_req_s integer; v_rel_s integer; v_cic_s boolean;
  v_req_y integer; v_rel_y integer; v_cic_y boolean;
  v_ciclica boolean := true;
begin
  if v_user is null or not (select private.has_role('validador'::public.app_role)) then raise exception 'Somente Validadores autenticados podem se habilitar.'; end if;
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

      raise exception 'Limite de tarefas por hora atingido. Tente novamente mais tarde.';
    end if;
  end if;
  if v_limite_disp>0 then
    select count(*)::integer into v_count_disp from public.habilitacoes h
      where h.validador_id=v_user and h.criado_em>=now()-interval '1 hour' and lower(coalesce(h.dispositivo_id,''))=lower(trim(p_dispositivo_id));
    if v_count_disp>=v_limite_disp then

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
    select r.quantidade_requisito,r.quantidade_liberada,r.ciclica into v_req_s,v_rel_s,v_cic_s from public.regras_liberacao r join public.tipos_tarefa o on o.id=r.tipo_origem_id join public.canais co on co.id=o.canal_id join public.tipos_tarefa d on d.id=r.tipo_destino_id join public.canais cd on cd.id=d.canal_id where r.ativo and co.slug='instagram' and cd.slug='site' limit 1;
    select r.quantidade_requisito,r.quantidade_liberada,r.ciclica into v_req_y,v_rel_y,v_cic_y from public.regras_liberacao r join public.tipos_tarefa o on o.id=r.tipo_origem_id join public.canais co on co.id=o.canal_id join public.tipos_tarefa d on d.id=r.tipo_destino_id join public.canais cd on cd.id=d.canal_id where r.ativo and co.slug='site' and cd.slug='youtube' limit 1;
    v_credit_s:=case when v_req_s is null or v_rel_s is null then 0 else greatest((case when v_cic_s then floor(v_i::numeric/v_req_s) else least(floor(v_i::numeric/v_req_s),1) end)*v_rel_s-v_s,0)::integer end;
    v_credit_y:=case when v_req_y is null or v_rel_y is null then 0 else greatest((case when v_cic_y then floor(v_s::numeric/v_req_y) else least(floor(v_s::numeric/v_req_y),1) end)*v_rel_y-v_y,0)::integer end;
    if v_canal='site' and v_credit_s<=0 then
      if v_req_s is null then raise exception 'Não há regra ativa para liberar visitas a sites.';
      elsif v_i<v_req_s then raise exception 'Ainda não há crédito para visitas a sites. Faça mais % tarefas de Instagram para liberar % visitas a sites.',v_req_s-v_i,v_rel_s;
      else raise exception 'Ainda não há crédito para visitas a sites. Faça mais % tarefas de Instagram para liberar mais % visitas a sites.',v_req_s,v_rel_s;
      end if;
    end if;
    if v_canal='youtube' and v_credit_y<=0 then
      if v_req_y is null then raise exception 'Não há regra ativa para liberar tarefas de YouTube.';
      elsif v_s<v_req_y then raise exception 'Ainda não há crédito para tarefas de YouTube. Faça mais % visitas a sites para liberar % tarefas de YouTube.',v_req_y-v_s,v_rel_y;
      else raise exception 'Ainda não há crédito para tarefas de YouTube. Faça mais % visitas a sites para liberar mais % tarefas de YouTube.',v_req_y,v_rel_y;
      end if;
    end if;
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

drop trigger if exists auditoria_regras_liberacao_fase9 on public.regras_liberacao;
drop function if exists public.auditar_regras_liberacao_fase9();

drop function if exists public.habilitar_tarefa(uuid);

insert into public.configuracoes(chave,valor)
values ('limite_tarefas_hora_validador','40'),('limite_tarefas_hora_dispositivo','30')
on conflict (chave) do update set valor=excluded.valor, atualizado_em=now();
