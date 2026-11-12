begin;

select plan(11);

select is(
  (select count(*)::integer from information_schema.tables
   where table_schema='public' and table_name in (
     'regras_liberacao','validador_contadores_diarios',
     'habilitacoes_contabilizadas','bloqueios','contestacoes_bloqueio'
   )),
  5,
  'tabelas da Fase 9 existem'
);

select ok(
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='bloqueios'
            and column_name='dia_referencia'),
  'bloqueios.dia_referencia existe'
);

select ok(
  exists (select 1 from pg_indexes
          where schemaname='public'
            and indexname='bloqueios_minimo_diario_validador_dia_uidx'),
  'indice unico de bloqueio diario existe'
);

select ok(
  exists (
    select 1 from public.regras_liberacao r
    join public.tipos_tarefa o on o.id=r.tipo_origem_id
    join public.canais co on co.id=o.canal_id
    join public.tipos_tarefa d on d.id=r.tipo_destino_id
    join public.canais cd on cd.id=d.canal_id
    where r.ativo and r.quantidade_requisito=10 and r.quantidade_liberada=5
      and co.slug='instagram' and cd.slug='site'
  ),
  'regra Instagram 10 para Site 5 esta configurada'
);

select ok(
  exists (
    select 1 from public.regras_liberacao r
    join public.tipos_tarefa o on o.id=r.tipo_origem_id
    join public.canais co on co.id=o.canal_id
    join public.tipos_tarefa d on d.id=r.tipo_destino_id
    join public.canais cd on cd.id=d.canal_id
    where r.ativo and r.quantidade_requisito=5 and r.quantidade_liberada=2
      and co.slug='site' and cd.slug='youtube'
  ),
  'regra Site 5 para YouTube 2 esta configurada'
);

select ok(
  position('regras_liberacao' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) > 0
  and position('::public.app_role' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) > 0
  and position('limite_velocidade_excedido' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) = 0,
  'habilitar_tarefa usa regras, cast qualificado e sem auditoria morta'
);

select ok(
  position('regras_liberacao' in pg_get_functiondef('public.obter_status_liberacao_fase9()'::regprocedure)) > 0,
  'status de liberacao consulta regras configuraveis'
);

select ok(
  position('regras_liberacao' in pg_get_functiondef('public.registrar_habilitacao_validada_fase9()'::regprocedure)) > 0,
  'contador de habilitacoes consulta regras configuraveis'
);

select ok(
  position('dia_referencia' in pg_get_functiondef('public.processar_bloqueios_diarios()'::regprocedure)) > 0,
  'rotina diaria usa dia_referencia'
);

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='habilitar_tarefa'
      and pg_get_function_identity_arguments(p.oid)='uuid'
  ),
  'assinatura antiga habilitar_tarefa(uuid) nao existe'
);

select ok(
  (select count(*) = 7
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname in (
       'habilitar_tarefa','contestar_bloqueio','decidir_contestacao_bloqueio',
       'salvar_regra_liberacao','obter_dados_admin_fase9',
       'obter_bloqueio_validador_fase9','obter_status_liberacao_fase9'
     )
     and p.prosrc like '%::public.app_role%'
     and p.prosrc not like '%::app_role%'),
  'as sete RPCs usam app_role qualificado'
);

select * from finish();

rollback;
