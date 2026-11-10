-- Fase 9: RPCs de leitura para as telas administrativas e do Validador.
create or replace function public.obter_dados_admin_fase9()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente Admin pode consultar os dados da Fase 9.';
  end if;

  return jsonb_build_object(
    'regras', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'origem', jsonb_build_object('id', o.id, 'nome', o.nome, 'canal', co.nome),
        'destino', jsonb_build_object('id', d.id, 'nome', d.nome, 'canal', cd.nome),
        'quantidade_requisito', r.quantidade_requisito,
        'quantidade_liberada', r.quantidade_liberada,
        'ciclica', r.ciclica,
        'ativo', r.ativo
      ) order by co.nome, o.nome), '[]'::jsonb)
      from public.regras_liberacao r
      join public.tipos_tarefa o on o.id=r.tipo_origem_id
      join public.canais co on co.id=o.canal_id
      join public.tipos_tarefa d on d.id=r.tipo_destino_id
      join public.canais cd on cd.id=d.canal_id
    ), '[]'::jsonb),
    'bloqueios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,'validador_id',b.validador_id,'motivo',b.motivo,
        'inicio',b.inicio,'fim',b.fim,'origem',b.origem,'status',b.status,'contestado',b.contestado
      ) order by b.fim desc)
      from public.bloqueios b
      where b.status in ('ativo','contestado') and b.fim > now()
    ), '[]'::jsonb),
    'contestacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,'bloqueio_id',c.bloqueio_id,'validador_id',c.validador_id,
        'texto',c.texto,'status',c.status,'criado_em',c.criado_em,'decisor',c.decisor
      ) order by c.criado_em asc)
      from public.contestacoes_bloqueio c
      where c.status='aberta'
    ), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.obter_dados_admin_fase9() from public, anon;
grant execute on function public.obter_dados_admin_fase9() to authenticated;

create or replace function public.obter_bloqueio_validador_fase9()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores podem consultar seu bloqueio.';
  end if;
  return coalesce((
    select jsonb_build_object(
      'bloqueio', jsonb_build_object(
        'id',b.id,'motivo',b.motivo,'inicio',b.inicio,'fim',b.fim,
        'origem',b.origem,'status',b.status,'contestado',b.contestado
      ),
      'contestacao', (
        select jsonb_build_object('id',c.id,'texto',c.texto,'status',c.status,'criado_em',c.criado_em)
        from public.contestacoes_bloqueio c where c.bloqueio_id=b.id
      )
    )
    from public.bloqueios b
    where b.validador_id=v_user and b.status in ('ativo','contestado') and b.fim>now()
    order by b.fim desc limit 1
  ), '{}'::jsonb);
end;
$function$;
revoke all on function public.obter_bloqueio_validador_fase9() from public, anon;
grant execute on function public.obter_bloqueio_validador_fase9() to authenticated;
