-- Prevent advertisers who also hold the validator role from validating
-- or reviewing their own publications. The checks are enforced in the
-- database RPCs, not only in the frontend.

do $migration$
declare
  v_definition text;
  v_original text;
  v_updated text;
begin
  -- A validator must not habilitate a task owned by the same account.
  select pg_get_functiondef('public.habilitar_tarefa(uuid)'::regprocedure)
    into v_definition;
  v_original := 'if v_tarefa.id is null then raise exception ''Tarefa indisponivel.''; end if;';
  v_updated := v_original || E'\n  if exists (select 1 from public.publicacoes where id = v_tarefa.publicacao_id and anunciante_id = v_user_id) then\n    raise exception ''Voce nao pode se habilitar na propria tarefa.'';\n  end if;';
  if position(v_original in v_definition) = 0 then
    raise exception 'Expected habilitar_tarefa guard not found; refusing partial migration.';
  end if;
  execute replace(v_definition, v_original, v_updated);

  -- Internal validation rounds must not select the publication owner as a validator.
  select pg_get_functiondef('public.iniciar_rodada_validacao(uuid)'::regprocedure)
    into v_definition;
  v_original := 'where cv.maior_de_18 = true';
  v_updated := 'where cv.usuario_id <> v_publicacao.anunciante_id' || E'\n      and cv.maior_de_18 = true';
  if position(v_original in v_definition) = 0 then
    raise exception 'Expected validator eligibility filter not found; refusing partial migration.';
  end if;
  execute replace(v_definition, v_original, v_updated);

  -- Defense in depth for any already-existing internal habilitation.
  select pg_get_functiondef('public.concluir_avaliacao_interna(uuid,text,smallint,smallint,smallint,text,jsonb,integer)'::regprocedure)
    into v_definition;
  v_original := 'if v_publicacao.id is null then raise exception ''Publicacao nao encontrada.''; end if;';
  v_updated := v_original || E'\n  if v_publicacao.anunciante_id = v_user_id then\n    raise exception ''O anunciante nao pode avaliar a propria publicacao.'';\n  end if;';
  if position(v_original in v_definition) = 0 then
    raise exception 'Expected publication ownership guard not found; refusing partial migration.';
  end if;
  execute replace(v_definition, v_original, v_updated);
end;
$migration$;
