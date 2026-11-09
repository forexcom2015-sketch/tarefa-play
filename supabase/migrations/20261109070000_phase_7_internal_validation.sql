-- Fase 7: validacao interna das publicacoes.
-- Esta migration permanece no GitHub e nao deve ser aplicada em producao nesta fase.

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  rodada_id uuid not null references public.rodadas_validacao(id) on delete restrict,
  validador_id uuid not null references auth.users(id) on delete restrict,
  compraria text not null check (compraria in ('sim','talvez','nao')),
  nota_produto smallint not null check (nota_produto between 1 and 5),
  nota_preco smallint not null check (nota_preco between 1 and 5),
  nota_divulgacao smallint not null check (nota_divulgacao between 1 and 5),
  comentario text not null check (length(trim(comentario)) >= 20),
  interacoes jsonb not null default '{}'::jsonb check (jsonb_typeof(interacoes) = 'object'),
  tempo_tela_segundos integer not null check (tempo_tela_segundos >= 10),
  criado_em timestamptz not null default now(),
  unique (rodada_id, validador_id)
);

create index if not exists avaliacoes_rodada_idx
  on public.avaliacoes (rodada_id, criado_em desc);
create index if not exists avaliacoes_validador_idx
  on public.avaliacoes (validador_id, criado_em desc);

alter table public.avaliacoes enable row level security;

drop policy if exists avaliacoes_select_owner_admin on public.avaliacoes;
create policy avaliacoes_select_owner_admin on public.avaliacoes
for select to authenticated
using (
  validador_id = (select auth.uid())
  or (select private.has_role('admin'::app_role))
);

revoke all on public.avaliacoes from anon, authenticated;
grant select on public.avaliacoes to authenticated;

-- Canal/tipo interno: a avaliacao nao executa uma acao real em rede social.
insert into public.canais (slug, nome, ativo)
values ('interno', 'Validação interna', true)
on conflict (slug) do update set nome = excluded.nome, ativo = true;

insert into public.tipos_tarefa (
  canal_id, acao, nome, valor_validador, metodo_verificacao, ativo
)
select c.id, 'avaliacao_publicacao', 'Avaliação interna de publicação',
       coalesce((select valor::numeric from public.configuracoes where chave = 'valor_avaliacao_interna'), 0.10),
       'avaliacao_interna', true
from public.canais c
where c.slug = 'interno'
on conflict (canal_id, acao) do update
set nome = excluded.nome,
    valor_validador = excluded.valor_validador,
    metodo_verificacao = excluded.metodo_verificacao,
    ativo = true;

-- Substitui o inicio da rodada da Fase 6 para criar a tarefa interna e
-- convocar 100 Validadores aptos, priorizando quem ja concluiu mais validacoes.
create or replace function public.iniciar_rodada_validacao(p_publicacao_id uuid)
returns table (rodada_id uuid, quantidade_estimada integer, valor_reservado numeric)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_publicacao public.publicacoes;
  v_valor numeric(14,2);
  v_estimativa integer;
  v_rodada_id uuid;
  v_tarefa_id uuid;
  v_tipo_tarefa_id uuid;
  v_prazo integer;
  v_convocados integer;
  v_handle text;
  v_user_id uuid;
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Somente Anunciantes autenticados podem iniciar validacoes.';
  end if;

  select * into v_publicacao
  from public.publicacoes
  where id = p_publicacao_id and anunciante_id = auth.uid()
  for update;

  if v_publicacao.id is null then
    raise exception 'Publicacao nao encontrada.';
  end if;
  if v_publicacao.status not in ('rascunho','aprovada') then
    raise exception 'Esta publicacao nao pode iniciar uma nova rodada neste status.';
  end if;
  if v_publicacao.revisao_admin_pendente then
    raise exception 'Esta publicacao aguarda revisao do Admin antes de contratar validacoes.';
  end if;
  if exists (
    select 1 from public.rodadas_validacao rv
    where rv.publicacao_id = p_publicacao_id and rv.status = 'em_andamento'
  ) then
    raise exception 'Ja existe uma rodada em andamento para esta publicacao.';
  end if;

  v_valor := greatest(coalesce((
    select valor::numeric from public.configuracoes
    where chave = 'pacote_validacao_minimo'
  ), 100), 0.01);

  v_estimativa := public.estimar_validadores_disponiveis(v_publicacao.categoria_id);
  if v_estimativa < 100 then
    raise exception 'Esta publicacao precisa de pelo menos 100 Validadores elegiveis para iniciar a rodada.';
  end if;

  perform public.reservar_pacote(v_valor, p_publicacao_id);

  insert into public.rodadas_validacao (
    publicacao_id, quantidade_contratada, quantidade_concluida, valor_reservado, status
  )
  values (p_publicacao_id, 100, 0, v_valor, 'em_andamento')
  returning id into v_rodada_id;

  select tt.id into v_tipo_tarefa_id
  from public.tipos_tarefa tt
  join public.canais c on c.id = tt.canal_id
  where c.slug = 'interno' and tt.acao = 'avaliacao_publicacao' and tt.ativo = true
  limit 1;

  if v_tipo_tarefa_id is null then
    raise exception 'Tipo de tarefa de avaliacao interna nao configurado.';
  end if;

  insert into public.tarefas (
    publicacao_id, tipo_tarefa_id, categoria_id, vagas, vagas_ocupadas,
    link_destino, tempo_estimado_minutos, status, is_demo
  )
  values (
    p_publicacao_id, v_tipo_tarefa_id, v_publicacao.categoria_id, 100, 0,
    v_publicacao.link, 2, 'ativa', false
  )
  returning id into v_tarefa_id;

  v_prazo := greatest(1, least(coalesce((
    select valor::integer from public.configuracoes
    where chave = 'prazo_habilitacao_horas'
  ), 2), 168));

  for v_user_id, v_handle in
    select cv.usuario_id, cs.handle
    from public.cadastro_validadores cv
    join public.contas_sociais cs
      on cs.usuario_id = cv.usuario_id
     and cs.canal = 'instagram'
     and cs.status = 'aprovada'
    where cv.maior_de_18 = true
      and cv.consentimento_lgpd_interesses = true
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = cv.usuario_id and ur.role = 'validador'
      )
      and exists (
        select 1 from public.aceites_contrato ac
        where ac.usuario_id = cv.usuario_id
      )
      and exists (
        select 1 from public.documentos_usuarios du
        where du.usuario_id = cv.usuario_id and du.tipo_documento = 'cpf'
      )
      and exists (
        select 1 from public.contas_pix cp
        where cp.usuario_id = cv.usuario_id and cp.aprovado = true
      )
      and exists (
        select 1 from public.interesses_validador iv
        where iv.usuario_id = cv.usuario_id
          and iv.categoria_id = v_publicacao.categoria_id
      )
      and (select count(*) from public.interesses_validador ivc
           where ivc.usuario_id = cv.usuario_id) between 3 and 8
      and not exists (
        select 1
        from public.habilitacoes h
        join public.tarefas t on t.id = h.tarefa_id
        where h.validador_id = cv.usuario_id
          and h.status in ('habilitado','em_andamento')
          and t.publicacao_id is not null
          and t.status = 'ativa'
      )
    order by (
      select count(*)
      from public.habilitacoes h2
      where h2.validador_id = cv.usuario_id
        and h2.status = 'validada'
    ) desc,
    cv.usuario_id
    limit 100
  loop
    insert into public.habilitacoes (
      tarefa_id, validador_id, handle, status, expira_em
    )
    values (
      v_tarefa_id, v_user_id, v_handle, 'habilitado',
      now() + make_interval(hours => v_prazo)
    );
    v_convocados := coalesce(v_convocados, 0) + 1;
  end loop;

  if v_convocados < 100 then
    raise exception 'Nao foi possivel convocar 100 Validadores elegiveis.';
  end if;

  update public.tarefas
  set vagas_ocupadas = v_convocados, atualizado_em = now()
  where id = v_tarefa_id;

  update public.publicacoes
  set status = 'em_validacao', atualizado_em = now()
  where id = p_publicacao_id;

  return query select v_rodada_id, v_convocados, v_valor;
end;
$$;

revoke all on function public.iniciar_rodada_validacao(uuid) from public, anon;
grant execute on function public.iniciar_rodada_validacao(uuid) to authenticated;

-- O Validador recebe somente os dados anonimizados necessarios para o feed.
create or replace function public.obter_tarefa_validacao(p_habilitacao_id uuid)
returns table (
  habilitacao_id uuid,
  tarefa_id uuid,
  rodada_id uuid,
  publicacao_id uuid,
  imagem_url text,
  legenda text,
  preco numeric,
  oferta text,
  categoria_nome text,
  expira_em timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem consultar a avaliacao.';
  end if;

  return query
  select h.id, t.id, rv.id, p.id, p.imagem_url, p.legenda, p.preco, p.oferta,
         c.nome, h.expira_em
  from public.habilitacoes h
  join public.tarefas t on t.id = h.tarefa_id
  join public.rodadas_validacao rv on rv.publicacao_id = t.publicacao_id
  join public.publicacoes p on p.id = t.publicacao_id
  join public.categorias c on c.id = p.categoria_id
  where h.id = p_habilitacao_id
    and h.validador_id = auth.uid()
    and h.status in ('habilitado','em_andamento')
    and t.tipo_tarefa_id = (
      select tt.id from public.tipos_tarefa tt
      join public.canais ch on ch.id = tt.canal_id
      where ch.slug = 'interno' and tt.acao = 'avaliacao_publicacao'
      limit 1
    )
    and rv.status = 'em_andamento';
end;
$$;

revoke all on function public.obter_tarefa_validacao(uuid) from public, anon;
grant execute on function public.obter_tarefa_validacao(uuid) to authenticated;

-- Grava a avaliacao e paga o Validador na mesma transacao. A nota nunca altera
-- o pagamento. O resultado do Anunciante permanece oculto ate 100 respostas.
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
set search_path = public, auth, pg_temp
as $$
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
  select * into v_rodada from public.rodadas_validacao
  where id = (select rv.id from public.rodadas_validacao rv where rv.publicacao_id = v_tarefa.publicacao_id and rv.status = 'em_andamento' limit 1)
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
$$;

revoke all on function public.concluir_avaliacao_interna(uuid,text,smallint,smallint,smallint,text,jsonb,integer) from public, anon;
grant execute on function public.concluir_avaliacao_interna(uuid,text,smallint,smallint,smallint,text,jsonb,integer) to authenticated;

-- Resultado privado: nenhuma nota/interacao individual fica exposta ao Anunciante.
create or replace function public.obter_resultado_validacao(p_rodada_id uuid)
returns table (
  disponivel boolean,
  total_avaliacoes integer,
  nota_geral numeric,
  percentual_aprovacao numeric,
  percentual_compraria numeric,
  nota_produto numeric,
  nota_preco numeric,
  nota_divulgacao numeric,
  motivos_mais_citados jsonb,
  diagnostico text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_rodada public.rodadas_validacao;
  v_total integer;
  v_inicio integer;
  v_fim integer;
  v_nota_geral numeric;
  v_produto numeric;
  v_preco numeric;
  v_divulgacao numeric;
  v_aprovacao numeric;
  v_compraria numeric;
  v_motivos jsonb;
  v_diagnostico text;
begin
  if auth.uid() is null then raise exception 'Autenticacao obrigatoria.'; end if;

  select * into v_rodada
  from public.rodadas_validacao rv
  join public.publicacoes p on p.id = rv.publicacao_id
  where rv.id = p_rodada_id
    and (p.anunciante_id = auth.uid() or (select private.has_role('admin'::app_role)));

  if v_rodada.id is null then raise exception 'Rodada nao encontrada.'; end if;

  select count(*) into v_total from public.avaliacoes where rodada_id = p_rodada_id;
  if v_total < 100 then
    return query select false, v_total, null::numeric, null::numeric, null::numeric,
      null::numeric, null::numeric, null::numeric, '[]'::jsonb, null::text;
    return;
  end if;

  v_inicio := floor(v_total * 0.05)::integer + 1;
  v_fim := v_total - floor(v_total * 0.05)::integer;

  select round(avg(x.nota_produto), 2),
         round(avg(x.nota_preco), 2),
         round(avg(x.nota_divulgacao), 2)
  into v_produto, v_preco, v_divulgacao
  from (
    select a.nota_produto, a.nota_preco, a.nota_divulgacao
    from public.avaliacoes a
    where a.rodada_id = p_rodada_id
    order by (a.nota_produto + a.nota_preco + a.nota_divulgacao), a.id
    offset v_inicio - 1
    limit v_fim - v_inicio + 1
  ) x;

  select round(avg(x.nota_media), 2)
  into v_nota_geral
  from (
    select ((a.nota_produto + a.nota_preco + a.nota_divulgacao) / 3.0) as nota_media
    from public.avaliacoes a
    where a.rodada_id = p_rodada_id
    order by ((a.nota_produto + a.nota_preco + a.nota_divulgacao) / 3.0), a.id
    offset v_inicio - 1
    limit v_fim - v_inicio + 1
  ) x;

  select round(100.0 * avg(case when a.nota_produto >= 4 and a.nota_preco >= 4 and a.nota_divulgacao >= 4 then 1 else 0 end), 2),
         round(100.0 * avg(case when a.compraria = 'sim' then 1 else 0 end), 2)
  into v_aprovacao, v_compraria
  from public.avaliacoes a
  where a.rodada_id = p_rodada_id;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.total desc), '[]'::jsonb)
  into v_motivos
  from (
    select left(trim(a.comentario), 160) as motivo, count(*)::integer as total
    from public.avaliacoes a
    where a.rodada_id = p_rodada_id
    group by left(trim(a.comentario), 160)
    order by count(*) desc
    limit 5
  ) m;

  v_diagnostico := case
    when v_preco < least(v_produto, v_divulgacao) then 'Preço é o ponto mais criticado.'
    when v_produto < least(v_preco, v_divulgacao) then 'Produto é o ponto mais criticado.'
    when v_divulgacao < least(v_produto, v_preco) then 'Divulgação é o ponto mais criticado.'
    else 'Produto, preço e divulgação tiveram avaliações equilibradas.'
  end;

  return query select true, v_total, v_nota_geral, v_aprovacao, v_compraria,
    v_produto, v_preco, v_divulgacao, v_motivos, v_diagnostico;
end;
$$;

revoke all on function public.obter_resultado_validacao(uuid) from public, anon;
grant execute on function public.obter_resultado_validacao(uuid) to authenticated;

-- O Anunciante recebe apenas o resumo agregado; o Validador nunca enxerga notas de terceiros.
