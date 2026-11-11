begin;

do $test$
declare
  v_count integer;
  v_def text;
begin
  select count(*) into v_count from information_schema.tables
  where table_schema='public' and table_name in ('regras_liberacao','validador_contadores_diarios','habilitacoes_contabilizadas','bloqueios','contestacoes_bloqueio');
  if v_count <> 5 then raise exception 'FALHA: tabelas Fase 9 incompletas (%)',v_count; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bloqueios' and column_name='dia_referencia'
  ) then raise exception 'FALHA: bloqueios.dia_referencia ausente'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='bloqueios_minimo_diario_validador_dia_uidx'
  ) then raise exception 'FALHA: índice único diário ausente'; end if;

  if not exists (
    select 1 from public.regras_liberacao r
    join public.tipos_tarefa o on o.id=r.tipo_origem_id
    join public.canais co on co.id=o.canal_id
    join public.tipos_tarefa d on d.id=r.tipo_destino_id
    join public.canais cd on cd.id=d.canal_id
    where r.ativo and r.quantidade_requisito=10 and r.quantidade_liberada=5
      and co.slug='instagram' and cd.slug='site'
  ) then raise exception 'FALHA: seed Instagram 10 -> Site 5 ausente'; end if;

  if not exists (
    select 1 from public.regras_liberacao r
    join public.tipos_tarefa o on o.id=r.tipo_origem_id
    join public.canais co on co.id=o.canal_id
    join public.tipos_tarefa d on d.id=r.tipo_destino_id
    join public.canais cd on cd.id=d.canal_id
    where r.ativo and r.quantidade_requisito=5 and r.quantidade_liberada=2
      and co.slug='site' and cd.slug='youtube'
  ) then raise exception 'FALHA: seed Site 5 -> YouTube 2 ausente'; end if;

  v_def := pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure);
  if position('regras_liberacao' in v_def)=0 then raise exception 'FALHA: habilitar_tarefa não lê regras_liberacao'; end if;
  if position('::public.app_role' in v_def)=0 then raise exception 'FALHA: habilitar_tarefa usa cast app_role não qualificado'; end if;
  if position('limite_velocidade_excedido' in v_def)>0 then raise exception 'FALHA: auditoria de velocidade morta permanece'; end if;

  v_def := pg_get_functiondef('public.obter_status_liberacao_fase9()'::regprocedure);
  if position('regras_liberacao' in v_def)=0 then raise exception 'FALHA: status de liberação não lê regras'; end if;

  v_def := pg_get_functiondef('public.registrar_habilitacao_validada_fase9()'::regprocedure);
  if position('regras_liberacao' in v_def)=0 then raise exception 'FALHA: contador não lê regras'; end if;

  v_def := pg_get_functiondef('public.processar_bloqueios_diarios()'::regprocedure);
  if position('dia_referencia' in v_def)=0 then raise exception 'FALHA: rotina diária não usa dia_referencia'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='habilitar_tarefa'
      and pg_get_function_identity_arguments(p.oid)='uuid'
  ) then raise exception 'FALHA: assinatura antiga habilitar_tarefa(uuid) permanece'; end if;

  raise notice 'Fase 9 database smoke tests: OK';
end
$test$;

rollback;
