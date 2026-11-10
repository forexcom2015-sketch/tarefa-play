begin;
select plan(17);

select has_table('public','regras_liberacao','regras_liberacao existe');
select has_table('public','validador_contadores_diarios','contadores diários existem');
select has_table('public','bloqueios','bloqueios existem');
select has_table('public','contestacoes_bloqueio','contestações existem');
select has_column('public','bloqueios','dia_referencia','bloqueios possui dia_referencia');
select has_index('public','bloqueios','bloqueios_minimo_diario_validador_dia_uidx','índice único de bloqueio diário existe');

select function_returns('public','habilitar_tarefa',ARRAY['uuid','text'],'uuid');
select function_returns('public','processar_bloqueios_diarios',ARRAY[]::text[],'integer');
select function_returns('public','obter_status_liberacao_fase9',ARRAY[]::text[],'record');

select results_eq(
  $$select count(*)::integer from public.regras_liberacao
    where ativo and quantidade_requisito=10 and quantidade_liberada=5
      and exists (
        select 1 from public.tipos_tarefa o
        join public.canais co on co.id=o.canal_id
        join public.tipos_tarefa d on d.id=tipo_destino_id
        join public.canais cd on cd.id=d.canal_id
        where o.id=tipo_origem_id and co.slug='instagram'
          and cd.slug='site'
      )$$,
  $$values (1::integer)$$,
  'seed Instagram 10 -> Site 5 existe'
);

select results_eq(
  $$select count(*)::integer from public.regras_liberacao
    where ativo and quantidade_requisito=5 and quantidade_liberada=2
      and exists (
        select 1 from public.tipos_tarefa o
        join public.canais co on co.id=o.canal_id
        join public.tipos_tarefa d on d.id=tipo_destino_id
        join public.canais cd on cd.id=d.canal_id
        where o.id=tipo_origem_id and co.slug='site'
          and cd.slug='youtube'
      )$$,
  $$values (1::integer)$$,
  'seed Site 5 -> YouTube 2 existe'
);

select ok(
  position('regras_liberacao' in pg_get_functiondef('public.obter_status_liberacao_fase9()'::regprocedure)) > 0,
  'status lê regras_liberacao dinamicamente'
);
select ok(
  position('regras_liberacao' in pg_get_functiondef('public.registrar_habilitacao_validada_fase9()'::regprocedure)) > 0,
  'contador usa regras_liberacao dinamicamente'
);
select ok(
  position('regras_liberacao' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) > 0,
  'habilitar_tarefa usa regras_liberacao dinamicamente'
);

select ok(
  position('dia_referencia' in pg_get_functiondef('public.processar_bloqueios_diarios()'::regprocedure)) > 0,
  'rotina diária usa dia_referencia para idempotência'
);
select ok(
  position('limite_velocidade_excedido' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) = 0,
  'limite de velocidade não grava auditoria antes de lançar exceção'
);
select ok(
  position('::public.app_role' in pg_get_functiondef('public.habilitar_tarefa(uuid,text)'::regprocedure)) > 0,
  'habilitar_tarefa qualifica public.app_role'
);

select * from finish();
rollback;
