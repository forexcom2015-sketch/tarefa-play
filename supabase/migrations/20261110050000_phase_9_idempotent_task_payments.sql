-- Prevent duplicate financial settlement for the same validator habilitation.
-- Existing data was checked for duplicate task-payment ledger rows before adding these indexes.

create unique index if not exists lancamentos_pagamento_tarefa_referencia_unica
  on public.lancamentos (carteira_id, referencia_id)
  where tipo = 'pagamento_tarefa' and referencia_tipo = 'tarefa';

create unique index if not exists lancamentos_comissao_tarefa_referencia_unica
  on public.lancamentos (carteira_id, referencia_id)
  where tipo = 'comissao' and referencia_tipo = 'tarefa';

create or replace function public.pagar_tarefa(
  p_anunciante_id uuid,
  p_validador_id uuid,
  p_valor_validador numeric,
  p_referencia_id uuid
)
returns numeric
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions', 'pg_temp'
as $function$
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
  v_token_autorizado boolean := false;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and not (auth.uid() is not null and (select public.has_role(auth.uid(), 'admin'::public.app_role))) then
    select exists (
      select 1
      from public.tokens_tarefa tok
      join public.habilitacoes h on h.id = tok.habilitacao_id
      join public.tarefas t on t.id = h.tarefa_id
      join public.publicacoes p on p.id = t.publicacao_id
      join public.tipos_tarefa tt on tt.id = t.tipo_tarefa_id
      where h.id = p_referencia_id
        and tok.status = 'usado'
        and tok.usado_em is not null
        and h.validador_id = auth.uid()
        and p_validador_id = auth.uid()
        and p.anunciante_id = p_anunciante_id
        and round(tt.valor_validador, 2) = round(p_valor_validador, 2)
    ) into v_token_autorizado;
    if not v_token_autorizado then
      raise exception 'Somente Admin, backend autorizado ou Validador com token consumido pode confirmar pagamentos.';
    end if;
  end if;

  if p_valor_validador is null or p_valor_validador <= 0
    or p_anunciante_id = p_validador_id or p_referencia_id is null then
    raise exception 'Parametros de pagamento invalidos.';
  end if;

  -- Serialize every attempt for this habilitation and make settlement idempotent.
  perform pg_advisory_xact_lock(hashtextextended(p_referencia_id::text, 0));
  if exists (
    select 1
    from public.lancamentos
    where tipo = 'pagamento_tarefa'
      and referencia_tipo = 'tarefa'
      and referencia_id = p_referencia_id
  ) then
    raise exception 'Esta habilitacao ja possui pagamento registrado.';
  end if;

  if not exists (select 1 from public.user_roles where user_id = p_anunciante_id and role = 'anunciante')
    or not exists (select 1 from public.user_roles where user_id = p_validador_id and role = 'validador') then
    raise exception 'Os papeis do Anunciante e do Validador nao correspondem.';
  end if;

  select * into v_carteira_anunciante from public.carteiras where usuario_id = p_anunciante_id;
  if v_carteira_anunciante.id is null then raise exception 'Carteira do Anunciante nao encontrada.'; end if;
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

  select coalesce(valor::numeric, 35) into v_comissao_pct
  from public.configuracoes where chave = 'comissao_percentual';
  if v_comissao_pct < 0 or v_comissao_pct >= 100 then
    raise exception 'Percentual de comissao invalido.';
  end if;
  v_comissao := round(p_valor_validador * v_comissao_pct / (100 - v_comissao_pct), 2);
  v_bruto := round(p_valor_validador, 2) + v_comissao;
  if v_reservado < v_bruto then
    raise exception 'Saldo reservado insuficiente para pagar esta tarefa.';
  end if;

  select coalesce(valor::integer, 24) into v_pendente_horas
  from public.configuracoes where chave = 'pendente_horas_novos';
  select not exists (
    select 1 from public.lancamentos
    where carteira_id = v_carteira_validador.id
      and tipo = 'pagamento_tarefa'
      and valor > 0
      and disponivel_em <= now()
  ) into v_primeiro_pagamento;
  v_disponivel_em := case
    when v_primeiro_pagamento then now() + make_interval(hours => greatest(v_pendente_horas, 0))
    else now()
  end;

  insert into public.lancamentos (carteira_id, tipo, valor, status, disponivel_em, referencia_tipo, referencia_id)
  values
    (v_carteira_anunciante.id, 'pagamento_tarefa', -round(p_valor_validador, 2), 'confirmado', now(), 'tarefa', p_referencia_id),
    (v_carteira_validador.id, 'pagamento_tarefa', round(p_valor_validador, 2), 'confirmado', v_disponivel_em, 'tarefa', p_referencia_id);

  if v_comissao > 0 then
    insert into public.lancamentos (carteira_id, tipo, valor, status, disponivel_em, referencia_tipo, referencia_id)
    values (v_carteira_anunciante.id, 'comissao', -v_comissao, 'confirmado', now(), 'tarefa', p_referencia_id);
  end if;

  return v_bruto;
end;
$function$;

revoke all on function public.pagar_tarefa(uuid, uuid, numeric, uuid) from public, anon;
grant execute on function public.pagar_tarefa(uuid, uuid, numeric, uuid) to authenticated, service_role;
