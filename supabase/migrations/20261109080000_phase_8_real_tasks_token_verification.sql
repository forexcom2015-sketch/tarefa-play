-- Fase 8: tarefas reais, tokens individuais e chamados de verificacao.
-- Esta migration e somente codigo versionado; nao aplicar em producao nesta fase.
-- Tokens em texto puro sao retornados uma unica vez na geracao/exportacao.
-- O banco armazena exclusivamente SHA-256 do token.

create extension if not exists pgcrypto with schema extensions;

alter table public.tarefas
  add column if not exists tokens_exportados_em timestamptz;

create index if not exists tarefas_publicacao_idx
  on public.tarefas (publicacao_id, criado_em desc);

create table if not exists public.tokens_tarefa (
  id uuid primary key default gen_random_uuid(),
  habilitacao_id uuid not null references public.habilitacoes(id) on delete restrict,
  hash text not null unique check (hash ~ '^[0-9a-f]{64}$'),
  expira_em timestamptz not null,
  usado_em timestamptz,
  tentativas integer not null default 0 check (tentativas >= 0),
  limite_tentativas integer not null default 5 check (limite_tentativas between 1 and 10),
  status text not null default 'ativo'
    check (status in ('ativo','usado','expirado','invalidado','bloqueado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists tokens_tarefa_ativo_habilitacao_unique
  on public.tokens_tarefa (habilitacao_id) where status = 'ativo';
create index if not exists tokens_tarefa_expiracao_idx
  on public.tokens_tarefa (status, expira_em);

create table if not exists public.chamados_token (
  id uuid primary key default gen_random_uuid(),
  habilitacao_id uuid not null references public.habilitacoes(id) on delete restrict,
  motivo text not null check (length(trim(motivo)) between 10 and 1000),
  link_comentario text not null check (link_comentario ~* '^https?://'),
  evidencia text,
  status text not null default 'aguardando_anunciante'
    check (status in ('aguardando_anunciante','em_suporte','resolvido','indeferido')),
  prazo timestamptz not null,
  responsavel uuid references auth.users(id) on delete set null,
  resposta_anunciante text,
  decisao_suporte text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists chamados_token_aberto_habilitacao_unique
  on public.chamados_token (habilitacao_id)
  where status in ('aguardando_anunciante','em_suporte');
create index if not exists chamados_token_fila_idx
  on public.chamados_token (status, prazo);

alter table public.tokens_tarefa enable row level security;
alter table public.chamados_token enable row level security;

drop policy if exists chamados_token_select_partes_admin on public.chamados_token;
create policy chamados_token_select_partes_admin on public.chamados_token
for select to authenticated
using (
  (select private.has_role('admin'::app_role))
  or exists (
    select 1
    from public.habilitacoes h
    where h.id = chamados_token.habilitacao_id
      and h.validador_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.habilitacoes h
    join public.tarefas t on t.id = h.tarefa_id
    join public.publicacoes p on p.id = t.publicacao_id
    where h.id = chamados_token.habilitacao_id
      and p.anunciante_id = (select auth.uid())
  )
);

drop policy if exists tarefas_select_advertiser_owner on public.tarefas;
create policy tarefas_select_advertiser_owner on public.tarefas
for select to authenticated
using (
  exists (
    select 1 from public.publicacoes p
    where p.id = tarefas.publicacao_id
      and p.anunciante_id = (select auth.uid())
  )
);

drop policy if exists habilitacoes_select_advertiser_owner on public.habilitacoes;
create policy habilitacoes_select_advertiser_owner on public.habilitacoes
for select to authenticated
using (
  exists (
    select 1
    from public.tarefas t
    join public.publicacoes p on p.id = t.publicacao_id
    where t.id = habilitacoes.tarefa_id
      and p.anunciante_id = (select auth.uid())
  )
);

revoke all on public.tokens_tarefa, public.chamados_token from anon, authenticated;
grant select on public.chamados_token to authenticated;
-- tokens_tarefa nao recebe grants diretos: hash e metadados ficam atras das RPCs.

-- Tipo real inicial: comentario em publicacao do Instagram.
insert into public.tipos_tarefa (canal_id, acao, nome, valor_validador, metodo_verificacao, ativo)
select c.id, 'comentar_publicacao', 'Comentar publicação no Instagram',
       coalesce((
         select tt.valor_validador
         from public.tipos_tarefa tt
         join public.canais ci on ci.id = tt.canal_id
         where ci.slug = 'instagram'
         order by tt.criado_em
         limit 1
       ), 0.10),
       'token_lista', true
from public.canais c
where c.slug = 'instagram'
on conflict (canal_id, acao) do update
set nome = excluded.nome,
    metodo_verificacao = excluded.metodo_verificacao,
    ativo = true;

-- Criacao de tarefa real: somente publicacao aprovada do proprio Anunciante.
create or replace function public.criar_tarefa_real(
  p_publicacao_id uuid,
  p_tipo_tarefa_id uuid,
  p_link_publicacao text,
  p_vagas integer
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_publicacao public.publicacoes;
  v_tipo public.tipos_tarefa;
  v_tarefa_id uuid;
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Somente Anunciantes autenticados podem criar tarefas reais.';
  end if;
  if p_vagas is null or p_vagas < 1 or p_vagas > 10000 then
    raise exception 'Informe uma quantidade de vagas entre 1 e 10000.';
  end if;
  if p_link_publicacao is null or p_link_publicacao !~* '^https?://' then
    raise exception 'Informe o link publico da publicacao real.';
  end if;

  select * into v_publicacao
  from public.publicacoes
  where id = p_publicacao_id and anunciante_id = auth.uid()
  for update;
  if v_publicacao.id is null or v_publicacao.status <> 'aprovada'
     or v_publicacao.revisao_admin_pendente then
    raise exception 'A tarefa exige uma publicacao aprovada e sem revisao pendente.';
  end if;

  select tt.* into v_tipo
  from public.tipos_tarefa tt
  join public.canais c on c.id = tt.canal_id
  where tt.id = p_tipo_tarefa_id
    and tt.ativo = true
    and c.ativo = true
    and c.slug = 'instagram'
    and tt.metodo_verificacao = 'token_lista';
  if v_tipo.id is null then
    raise exception 'Nesta fase, somente comentario no Instagram com token esta habilitado.';
  end if;

  insert into public.tarefas (
    publicacao_id, tipo_tarefa_id, categoria_id, vagas, link_destino,
    tempo_estimado_minutos, status, is_demo
  ) values (
    v_publicacao.id, v_tipo.id, v_publicacao.categoria_id, p_vagas,
    trim(p_link_publicacao), 5, 'ativa', false
  ) returning id into v_tarefa_id;

  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (auth.uid(), 'tarefa_real_criada', 'tarefas',
    jsonb_build_object('tarefa_id', v_tarefa_id, 'publicacao_id', v_publicacao.id, 'vagas', p_vagas));

  return v_tarefa_id;
end;
$$;

revoke all on function public.criar_tarefa_real(uuid,uuid,text,integer) from public, anon;
grant execute on function public.criar_tarefa_real(uuid,uuid,text,integer) to authenticated;

-- Lista apenas @, status e prazo; nunca retorna hash ou token em texto.
create or replace function public.listar_habilitacoes_tarefa(p_tarefa_id uuid)
returns table (
  habilitacao_id uuid,
  handle text,
  status text,
  expira_em timestamptz,
  token_status text,
  token_expira_em timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Acesso restrito ao Anunciante.';
  end if;
  if not exists (
    select 1 from public.tarefas t
    join public.publicacoes p on p.id = t.publicacao_id
    where t.id = p_tarefa_id and p.anunciante_id = auth.uid()
  ) then
    raise exception 'Tarefa nao encontrada.';
  end if;

  return query
  select h.id, h.handle, h.status, h.expira_em, tok.status, tok.expira_em
  from public.habilitacoes h
  left join lateral (
    select x.status, x.expira_em
    from public.tokens_tarefa x
    where x.habilitacao_id = h.id
    order by x.criado_em desc
    limit 1
  ) tok on true
  where h.tarefa_id = p_tarefa_id
  order by h.criado_em;
end;
$$;

revoke all on function public.listar_habilitacoes_tarefa(uuid) from public, anon;
grant execute on function public.listar_habilitacoes_tarefa(uuid) to authenticated;

-- Emite um token novo por habilitacao elegivel. Reemitir invalida o anterior.
-- O codigo puro so existe no retorno desta chamada e nao e persistido.
create or replace function public.gerar_tokens_tarefa(p_tarefa_id uuid)
returns table (habilitacao_id uuid, handle text, codigo text, expira_em timestamptz)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_tarefa public.tarefas;
  v_publicacao public.publicacoes;
  v_habilitacao public.habilitacoes;
  v_codigo text;
  v_expira timestamptz;
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Acesso restrito ao Anunciante.';
  end if;

  select t.* into v_tarefa
  from public.tarefas t
  join public.publicacoes p on p.id = t.publicacao_id
  where t.id = p_tarefa_id and p.anunciante_id = auth.uid()
  for update;
  if v_tarefa.id is null or v_tarefa.is_demo then
    raise exception 'Tarefa real nao encontrada.';
  end if;

  select * into v_publicacao from public.publicacoes where id = v_tarefa.publicacao_id;
  if v_publicacao.status <> 'aprovada' then
    raise exception 'A publicacao precisa continuar aprovada.';
  end if;

  for v_habilitacao in
    select h.*
    from public.habilitacoes h
    where h.tarefa_id = p_tarefa_id
      and h.status in ('habilitado','em_andamento')
      and h.expira_em > now()
    order by h.criado_em
    for update
  loop
    update public.tokens_tarefa
    set status = 'invalidado', atualizado_em = now()
    where tokens_tarefa.habilitacao_id = v_habilitacao.id
      and tokens_tarefa.status = 'ativo';

    v_codigo := upper(encode(gen_random_bytes(16), 'hex'));
    v_expira := least(now() + interval '30 minutes', v_habilitacao.expira_em);

    insert into public.tokens_tarefa (habilitacao_id, hash, expira_em)
    values (
      v_habilitacao.id,
      encode(digest(v_codigo, 'sha256'), 'hex'),
      v_expira
    );

    insert into public.auditoria (usuario_id, acao, entidade, dados)
    values (auth.uid(), 'token_tarefa_emitido', 'tokens_tarefa',
      jsonb_build_object('tarefa_id', p_tarefa_id, 'habilitacao_id', v_habilitacao.id,
        'handle', v_habilitacao.handle, 'expira_em', v_expira));

    habilitacao_id := v_habilitacao.id;
    handle := v_habilitacao.handle;
    codigo := v_codigo;
    expira_em := v_expira;
    return next;
  end loop;
end;
$$;

revoke all on function public.gerar_tokens_tarefa(uuid) from public, anon;
grant execute on function public.gerar_tokens_tarefa(uuid) to authenticated;

create or replace function public.marcar_tokens_exportados(p_tarefa_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Acesso restrito ao Anunciante.';
  end if;
  update public.tarefas t
  set tokens_exportados_em = now(), atualizado_em = now()
  where t.id = p_tarefa_id
    and exists (
      select 1 from public.publicacoes p
      where p.id = t.publicacao_id and p.anunciante_id = auth.uid()
    );
  if not found then raise exception 'Tarefa nao encontrada.'; end if;
end;
$$;

revoke all on function public.marcar_tokens_exportados(uuid) from public, anon;
grant execute on function public.marcar_tokens_exportados(uuid) to authenticated;

-- Permite pagar_tarefa a partir de um token consumido pelo proprio Validador.
-- O fluxo de verificacao consome o token antes de chamar esta funcao, na mesma transacao.
create or replace function public.pagar_tarefa(
  p_anunciante_id uuid,
  p_validador_id uuid,
  p_valor_validador numeric,
  p_referencia_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
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
    and not (auth.uid() is not null and (select private.has_role('admin'::app_role))) then
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

  if p_valor_validador is null or p_valor_validador <= 0 or p_anunciante_id = p_validador_id or p_referencia_id is null then
    raise exception 'Parametros de pagamento invalidos.';
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
$$;

revoke all on function public.pagar_tarefa(uuid,uuid,numeric,uuid) from public, anon;
grant execute on function public.pagar_tarefa(uuid,uuid,numeric,uuid) to authenticated;

-- Valida codigo de uso unico, pertencente ao Validador autenticado.
create or replace function public.validar_token_tarefa(p_habilitacao_id uuid, p_codigo text)
returns numeric
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_habilitacao public.habilitacoes;
  v_token public.tokens_tarefa;
  v_tarefa public.tarefas;
  v_publicacao public.publicacoes;
  v_tipo public.tipos_tarefa;
  v_hash text;
  v_pagamento numeric(14,2);
begin
  if v_user_id is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores autenticados podem validar tokens.';
  end if;
  if p_codigo is null or length(trim(p_codigo)) < 16 or length(trim(p_codigo)) > 128 then
    raise exception 'Codigo invalido.';
  end if;

  select * into v_habilitacao
  from public.habilitacoes
  where id = p_habilitacao_id and validador_id = v_user_id
  for update;
  if v_habilitacao.id is null or v_habilitacao.status not in ('habilitado','em_andamento') then
    raise exception 'Esta habilitacao nao esta mais disponivel.';
  end if;
  if v_habilitacao.expira_em <= now() then
    perform private.expirar_habilitacoes_validador();
    raise exception 'O prazo da habilitacao expirou.';
  end if;

  select * into v_token
  from public.tokens_tarefa
  where habilitacao_id = p_habilitacao_id and status = 'ativo'
  for update;
  if v_token.id is null then
    raise exception 'Nao ha token ativo para esta habilitacao. Solicite um novo codigo ao Anunciante.';
  end if;
  if v_token.expira_em <= now() then
    update public.tokens_tarefa
    set status = 'expirado', atualizado_em = now()
    where id = v_token.id;
    raise exception 'Este codigo expirou. Solicite um novo token ao Anunciante.';
  end if;
  if v_token.tentativas >= v_token.limite_tentativas then
    update public.tokens_tarefa set status = 'bloqueado', atualizado_em = now() where id = v_token.id;
    raise exception 'Limite de tentativas atingido. Solicite um novo token ao Anunciante.';
  end if;

  v_hash := encode(digest(upper(trim(p_codigo)), 'sha256'), 'hex');
  if v_hash <> v_token.hash then
    update public.tokens_tarefa
    set tentativas = tentativas + 1,
        status = case when tentativas + 1 >= limite_tentativas then 'bloqueado' else 'ativo' end,
        atualizado_em = now()
    where id = v_token.id;
    insert into public.auditoria (usuario_id, acao, entidade, dados)
    values (v_user_id, 'token_tarefa_tentativa_invalida', 'tokens_tarefa',
      jsonb_build_object('habilitacao_id', p_habilitacao_id, 'tentativas', v_token.tentativas + 1));
    raise exception 'Codigo incorreto. Confira o codigo enviado pelo Anunciante.';
  end if;

  select * into v_tarefa from public.tarefas where id = v_habilitacao.tarefa_id for update;
  select * into v_publicacao from public.publicacoes where id = v_tarefa.publicacao_id;
  select * into v_tipo from public.tipos_tarefa where id = v_tarefa.tipo_tarefa_id;
  if v_publicacao.id is null or v_tipo.metodo_verificacao <> 'token_lista' then
    raise exception 'Esta tarefa nao utiliza verificacao por token.';
  end if;

  update public.tokens_tarefa
  set status = 'usado', usado_em = now(), atualizado_em = now()
  where id = v_token.id;

  update public.habilitacoes
  set status = 'validada', validada_em = now(), atualizado_em = now()
  where id = p_habilitacao_id;

  update public.tarefas
  set vagas_ocupadas = greatest(vagas_ocupadas - 1, 0), atualizado_em = now()
  where id = v_tarefa.id;

  v_pagamento := public.pagar_tarefa(
    v_publicacao.anunciante_id, v_user_id, v_tipo.valor_validador, v_habilitacao.id
  );

  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (v_user_id, 'token_tarefa_usado', 'tokens_tarefa',
    jsonb_build_object('tarefa_id', v_tarefa.id, 'habilitacao_id', p_habilitacao_id,
      'token_id', v_token.id, 'pagamento_bruto', v_pagamento));

  return v_pagamento;
end;
$$;

revoke all on function public.validar_token_tarefa(uuid,text) from public, anon;
grant execute on function public.validar_token_tarefa(uuid,text) to authenticated;

create or replace function public.abrir_chamado_token(
  p_habilitacao_id uuid,
  p_motivo text,
  p_link_comentario text,
  p_evidencia text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_habilitacao public.habilitacoes;
  v_id uuid;
begin
  if auth.uid() is null or not (select private.has_role('validador'::app_role)) then
    raise exception 'Somente Validadores podem abrir chamados.';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 10 or length(trim(p_motivo)) > 1000
    or p_link_comentario is null or p_link_comentario !~* '^https?://' then
    raise exception 'Informe o motivo e o link publico do comentario.';
  end if;

  select * into v_habilitacao
  from public.habilitacoes
  where id = p_habilitacao_id and validador_id = auth.uid()
    and status in ('habilitado','em_andamento')
  for update;
  if v_habilitacao.id is null then
    raise exception 'Habilitacao ativa nao encontrada.';
  end if;
  if exists (
    select 1 from public.chamados_token
    where habilitacao_id = p_habilitacao_id
      and status in ('aguardando_anunciante','em_suporte')
  ) then
    raise exception 'Ja existe um chamado aberto para esta habilitacao.';
  end if;

  insert into public.chamados_token (
    habilitacao_id, motivo, link_comentario, evidencia, prazo
  ) values (
    p_habilitacao_id, trim(p_motivo), trim(p_link_comentario), nullif(trim(p_evidencia), ''),
    now() + interval '24 hours'
  ) returning id into v_id;

  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (auth.uid(), 'chamado_token_aberto', 'chamados_token',
    jsonb_build_object('chamado_id', v_id, 'habilitacao_id', p_habilitacao_id));

  return v_id;
end;
$$;

revoke all on function public.abrir_chamado_token(uuid,text,text,text) from public, anon;
grant execute on function public.abrir_chamado_token(uuid,text,text,text) to authenticated;

-- Chamados sem resposta em 24h sobem para o suporte e recebem prazo de 48h.
create or replace function public.processar_chamados_token_expirados()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_total integer;
begin
  if auth.uid() is not null
    and not (
      (select private.has_role('admin'::app_role))
      or (select private.has_role('anunciante'::app_role))
      or (select private.has_role('validador'::app_role))
    ) then
    raise exception 'Acesso restrito.';
  end if;

  update public.chamados_token
  set status = 'em_suporte',
      prazo = now() + interval '48 hours',
      atualizado_em = now()
  where status = 'aguardando_anunciante'
    and prazo <= now();
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.processar_chamados_token_expirados() from public, anon;
grant execute on function public.processar_chamados_token_expirados() to authenticated;

create or replace function public.responder_chamado_token(
  p_chamado_id uuid,
  p_resposta text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not (select private.has_role('anunciante'::app_role)) then
    raise exception 'Somente o Anunciante pode responder nesta etapa.';
  end if;
  if p_resposta is null or length(trim(p_resposta)) < 5 or length(trim(p_resposta)) > 1000 then
    raise exception 'Informe uma resposta com pelo menos 5 caracteres.';
  end if;

  update public.chamados_token c
  set resposta_anunciante = trim(p_resposta),
      status = 'resolvido',
      responsavel = auth.uid(),
      atualizado_em = now()
  where c.id = p_chamado_id
    and c.status = 'aguardando_anunciante'
    and c.prazo > now()
    and exists (
      select 1
      from public.habilitacoes h
      join public.tarefas t on t.id = h.tarefa_id
      join public.publicacoes p on p.id = t.publicacao_id
      where h.id = c.habilitacao_id and p.anunciante_id = auth.uid()
    );
  if not found then raise exception 'Chamado nao esta mais na etapa do Anunciante.'; end if;
end;
$$;

revoke all on function public.responder_chamado_token(uuid,text) from public, anon;
grant execute on function public.responder_chamado_token(uuid,text) to authenticated;

create or replace function public.resolver_chamado_token(
  p_chamado_id uuid,
  p_decisao text,
  p_observacao text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_chamado public.chamados_token;
  v_habilitacao public.habilitacoes;
  v_tarefa public.tarefas;
  v_publicacao public.publicacoes;
  v_tipo public.tipos_tarefa;
begin
  if auth.uid() is null or not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente o suporte Admin pode decidir este chamado.';
  end if;
  if p_decisao not in ('pagar','indeferir')
    or p_observacao is null or length(trim(p_observacao)) < 10 then
    raise exception 'Informe uma decisao e uma justificativa com pelo menos 10 caracteres.';
  end if;

  select * into v_chamado from public.chamados_token
  where id = p_chamado_id and status = 'em_suporte'
  for update;
  if v_chamado.id is null then raise exception 'Chamado nao esta na fila do suporte.'; end if;
  if v_chamado.prazo <= now() then raise exception 'O prazo de decisao do suporte expirou.'; end if;

  select * into v_habilitacao from public.habilitacoes
  where id = v_chamado.habilitacao_id for update;
  select * into v_tarefa from public.tarefas where id = v_habilitacao.tarefa_id for update;
  select * into v_publicacao from public.publicacoes where id = v_tarefa.publicacao_id;
  select * into v_tipo from public.tipos_tarefa where id = v_tarefa.tipo_tarefa_id;

  if p_decisao = 'pagar' then
    if v_habilitacao.status not in ('habilitado','em_andamento') then
      raise exception 'A habilitacao nao pode mais receber pagamento.';
    end if;
    perform public.pagar_tarefa(
      v_publicacao.anunciante_id, v_habilitacao.validador_id,
      v_tipo.valor_validador, v_habilitacao.id
    );
    update public.habilitacoes
    set status = 'validada', validada_em = now(), atualizado_em = now()
    where id = v_habilitacao.id;
    update public.tarefas
    set vagas_ocupadas = greatest(vagas_ocupadas - 1, 0), atualizado_em = now()
    where id = v_tarefa.id;
    update public.tokens_tarefa
    set status = 'invalidado', atualizado_em = now()
    where habilitacao_id = v_habilitacao.id and status = 'ativo';
  end if;

  update public.chamados_token
  set status = case when p_decisao = 'pagar' then 'resolvido' else 'indeferido' end,
      responsavel = auth.uid(),
      decisao_suporte = trim(p_observacao),
      atualizado_em = now()
  where id = p_chamado_id;

  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (auth.uid(), 'chamado_token_decidido', 'chamados_token',
    jsonb_build_object('chamado_id', p_chamado_id, 'decisao', p_decisao,
      'habilitacao_id', v_habilitacao.id, 'lista_exportada_em', v_tarefa.tokens_exportados_em));
end;
$$;

revoke all on function public.resolver_chamado_token(uuid,text,text) from public, anon;
grant execute on function public.resolver_chamado_token(uuid,text,text) to authenticated;

-- A rotina cron e opcional; a RPC acima tambem e chamada ao abrir as telas.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $schedule$
      select cron.schedule(
        'tarefa-play-escalar-chamados-token',
        '* * * * *',
        'select public.processar_chamados_token_expirados()'
      )
    $schedule$;
  end if;
exception when others then
  raise notice 'Agendamento pg_cron nao criado; a escalacao tambem ocorre sob demanda: %', sqlerrm;
end;
$$;
