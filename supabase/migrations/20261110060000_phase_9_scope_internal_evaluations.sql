-- Scope internal evaluation submissions to the internal validation task type.
-- Without this check, a validator with an active habilitation for another task
-- belonging to the same publication could call this RPC directly and submit
-- an internal evaluation (including its associated internal payout).

create or replace function public.concluir_avaliacao_interna(
  p_habilitacao_id uuid,
  p_compraria text,
  p_nota_produto smallint,
  p_nota_preco smallint,
  p_nota_divulgacao smallint,
  p_comentario text,
  p_interacoes jsonb,
  p_tempo_tela_segundos integer
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_habilitacao public.habilitacoes;
  v_tarefa public.tarefas;
  v_rodada public.rodadas_validacao;
  v_publicacao public.publicacoes;
  v_avaliacao_id uuid;
  v_valor_validador numeric(10,2);
  v_comissao_pct numeric(8,4);
  v_comissao numeric(14,2);
  v_bruto numeric(14,2);
  v_carteira_anunciante public.carteiras;
  v_carteira_validador public.carteiras;
  v_pendentes integer;
  v_disponivel_em timestamptz;
  v_primeiro_pagamento boolean;
  v_concluidas integer;
  v_gasto numeric(14,2);
  v_liberar numeric(14,2);
begin
  if v_user_id is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem concluir avaliacao.';
  end if;

  if p_compraria not in ('sim','talvez','nao')
    or p_nota_produto not between 1 and 5
    or p_nota_preco not between 1 and 5
    or p_nota_divulgacao not between 1 and 5
    or p_comentario is null or length(trim(p_comentario)) < 20
    or p_interacoes is null or jsonb_typeof(p_interacoes) <> 'object'
    or p_tempo_tela_segundos < 10 then
    raise exception 'Avaliacao invalida. Complete interacoes, notas, comentario e tempo minimo.';
  end if;

  select * into v_habilitacao
  from public.habilitacoes
  where id = p_habilitacao_id and validador_id = v_user_id
  for update;

  if v_habilitacao.id is null or v_habilitacao.status not in ('habilitado','em_andamento') then
    raise exception 'Esta convocacao nao esta mais disponivel.';
  end if;
  if v_habilitacao.expira_em <= now() then
    perform private.expirar_habilitacoes_validador();
    raise exception 'O prazo desta avaliacao expirou.';
  end if;

  select * into v_tarefa from public.tarefas where id = v_habilitacao.tarefa_id for update;

  -- The RPC is exposed to authenticated validators, so do not rely only on
  -- the frontend's task lookup to establish that this is an internal round.
  if v_tarefa.id is null or v_tarefa.is_demo is true
    or not exists (
      select 1
      from public.tipos_tarefa tt
      join public.canais ch on ch.id = tt.canal_id
      where tt.id = v_tarefa.tipo_tarefa_id
        and ch.slug = 'interno'
        and ch.ativo = true
        and tt.ativo = true
        and tt.acao = 'avaliacao_publicacao'
    ) then
    raise exception 'Esta convocacao nao pertence a uma tarefa de avaliacao interna.';
  end if;

  select rv.* into v_rodada from public.rodadas_validacao rv
  where rv.id = (
    select rv2.id from public.rodadas_validacao rv2
    where rv2.publicacao_id = v_tarefa.publicacao_id and rv2.status = 'em_andamento'
    limit 1
  )
  for update;
  if v_rodada.id is null then raise exception 'Rodada de validacao nao encontrada.'; end if;

  select * into v_publicacao from public.publicacoes where id = v_tarefa.publicacao_id;
  if v_publicacao.id is null then raise exception 'Publicacao nao encontrada.'; end if;

  if exists (
    select 1 from public.avaliacoes
    where rodada_id = v_rodada.id and validador_id = v_user_id
  ) then
    raise exception 'Esta avaliacao ja foi enviada.';
  end if;

  insert into public.avaliacoes (
    rodada_id, validador_id, compraria, nota_produto, nota_preco,
    nota_divulgacao, comentario, interacoes, tempo_tela_segundos
  )
  values (
    v_rodada.id, v_user_id, p_compraria, p_nota_produto, p_nota_preco,
    p_nota_divulgacao, trim(p_comentario), p_interacoes, p_tempo_tela_segundos
  )
  returning id into v_avaliacao_id;

  v_valor_validador := greatest(coalesce((
    select valor::numeric from public.configuracoes
    where chave = 'valor_avaliacao_interna'
  ), 0.10), 0.01);
  v_comissao_pct := greatest(coalesce((
    select valor::numeric from public.configuracoes
    where chave = 'comissao_percentual'
  ), 35), 0);
  if v_comissao_pct >= 100 then raise exception 'Percentual de comissao invalido.'; end if;

  v_comissao := round(v_valor_validador * v_comissao_pct / (100 - v_comissao_pct), 2);
  v_bruto := round(v_valor_validador + v_comissao, 2);

  select * into v_carteira_anunciante
  from public.carteiras where usuario_id = v_publicacao.anunciante_id for update;
  if v_carteira_anunciante.id is null then raise exception 'Carteira do Anunciante nao encontrada.'; end if;

  insert into public.carteiras (usuario_id) values (v_user_id)
  on conflict (usuario_id) do nothing;
  select * into v_carteira_validador from public.carteiras where usuario_id = v_user_id for update;

  select coalesce(valor::integer, 24) into v_pendentes
  from public.configuracoes where chave = 'pendente_horas_novos';
  select not exists (
    select 1 from public.lancamentos
    where carteira_id = v_carteira_validador.id
      and tipo = 'pagamento_tarefa'
      and valor > 0
      and disponivel_em <= now()
  ) into v_primeiro_pagamento;
  v_disponivel_em := case
    when v_primeiro_pagamento then now() + make_interval(hours => greatest(v_pendentes, 0))
    else now()
  end;

  insert into public.lancamentos (
    carteira_id, tipo, valor, status, disponivel_em, referencia_tipo, referencia_id
  )
  values
    (v_carteira_anunciante.id, 'pagamento_tarefa', -v_valor_validador, 'confirmado', now(), 'avaliacao_interna', v_avaliacao_id),
    (v_carteira_validador.id, 'pagamento_tarefa', v_valor_validador, 'confirmado', v_disponivel_em, 'avaliacao_interna', v_avaliacao_id),
    (v_carteira_anunciante.id, 'comissao', -v_comissao, 'confirmado', now(), 'avaliacao_interna', v_avaliacao_id);

  update public.habilitacoes
  set status = 'validada', validada_em = now(), atualizado_em = now()
  where id = v_habilitacao.id;

  update public.tarefas
  set atualizado_em = now()
  where id = v_tarefa.id;

  select count(*) into v_concluidas
  from public.avaliacoes
  where rodada_id = v_rodada.id;

  update public.rodadas_validacao
  set quantidade_concluida = v_concluidas,
      atualizado_em = now()
  where id = v_rodada.id;

  if v_concluidas >= 100 then
    select coalesce(sum(
      case when l.tipo in ('pagamento_tarefa','comissao') and l.valor < 0
           and l.referencia_tipo = 'avaliacao_interna'
           and l.referencia_id in (
             select a.id from public.avaliacoes a where a.rodada_id = v_rodada.id
           )
           then -l.valor else 0 end
    ), 0)
    into v_gasto
    from public.lancamentos l
    where l.carteira_id = v_carteira_anunciante.id;

    v_liberar := greatest(round(v_rodada.valor_reservado - v_gasto, 2), 0);
    if v_liberar > 0 then
      insert into public.lancamentos (
        carteira_id, tipo, valor, status, referencia_tipo, referencia_id
      )
      values (
        v_carteira_anunciante.id, 'liberacao_reserva', v_liberar,
        'confirmado', 'rodada_validacao', v_rodada.id
      );
    end if;

    update public.rodadas_validacao
    set status = 'concluida', atualizado_em = now()
    where id = v_rodada.id;

    update public.publicacoes
    set status = 'aprovada', atualizado_em = now()
    where id = v_publicacao.id;
  end if;

  return v_avaliacao_id;
end;
$function$;
