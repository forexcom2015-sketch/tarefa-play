do $fix$
declare r record; v_def text; v_n integer := 0;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'habilitar_tarefa','contestar_bloqueio','decidir_contestacao_bloqueio',
        'salvar_regra_liberacao','obter_dados_admin_fase9',
        'obter_bloqueio_validador_fase9','obter_status_liberacao_fase9'
      )
      and p.prosrc like '%::app_role%'
  loop
    v_def := replace(pg_get_functiondef(r.oid), '::app_role', '::public.app_role');
    execute v_def;
    v_n := v_n + 1;
  end loop;
  if v_n <> 7 then
    raise exception 'Esperado corrigir 7 funções, corrigidas: %', v_n;
  end if;
end
$fix$;