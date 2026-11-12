-- Fase 6: janelas do Anunciante, publicacoes e rodadas de validacao.
-- Esta migration deve ser aplicada somente na etapa final de validacao, nunca automaticamente em producao.

create table if not exists public.restricoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text not null,
  ativa boolean not null default true,
  exige_revisao boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into public.restricoes (nome, descricao, ativa, exige_revisao)
values
  ('Jogos de cassino', 'Produtos, serviços ou conteúdos relacionados a jogos de cassino e apostas.', true, false),
  ('Marketing multinível (MMN)', 'Ofertas baseadas em marketing multinível, recrutamento ou remuneração em rede.', true, false),
  ('Criptomoedas (exceto curso)', 'Produtos e serviços de criptomoedas. Cursos educacionais podem prosseguir mediante revisão administrativa.', true, true)
on conflict (nome) do update
set descricao = excluded.descricao,
    ativa = excluded.ativa,
    exige_revisao = excluded.exige_revisao,
    atualizado_em = now();

create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  anunciante_id uuid not null references auth.users(id) on delete restrict,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  publico_alvo jsonb not null default '{}'::jsonb
    check (jsonb_typeof(publico_alvo) = 'object'),
  imagem_url text not null check (length(trim(imagem_url)) > 0),
  legenda text not null check (length(trim(legenda)) > 0),
  link text not null check (link ~* '^https?://'),
  preco numeric(12,2) not null default 0 check (preco >= 0),
  oferta text not null check (length(trim(oferta)) > 0),
  versao integer not null default 1 check (versao > 0),
  status text not null default 'rascunho'
    check (status in ('rascunho','em_validacao','aprovada','publicada')),
  restricao_id uuid references public.restricoes(id) on delete restrict,
  produto_eh_curso boolean not null default false,
  revisao_admin_pendente boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists publicacoes_anunciante_status_data_idx
  on public.publicacoes (anunciante_id, status, atualizado_em desc);
create index if not exists publicacoes_categoria_status_idx
  on public.publicacoes (categoria_id, status);

create table if not exists public.rodadas_validacao (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes(id) on delete restrict,
  quantidade_contratada integer not null default 0 check (quantidade_contratada >= 0),
  quantidade_concluida integer not null default 0 check (quantidade_concluida >= 0),
  valor_reservado numeric(14,2) not null check (valor_reservado > 0),
  status text not null default 'em_andamento'
    check (status in ('em_andamento','concluida','cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists rodadas_validacao_publicacao_data_idx
  on public.rodadas_validacao (publicacao_id, criado_em desc);
create unique index if not exists rodadas_validacao_uma_ativa_por_publicacao
  on public.rodadas_validacao (publicacao_id)
  where status = 'em_andamento';

-- Liga as tarefas criadas na Fase 5 às publicações desta fase.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tarefas_publicacao_id_fkey'
      and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas
      add constraint tarefas_publicacao_id_fkey
      foreign key (publicacao_id) references public.publicacoes(id) on delete restrict;
  end if;
end;
$$;

alter table public.restricoes enable row level security;
alter table public.publicacoes enable row level security;
alter table public.rodadas_validacao enable row level security;

drop policy if exists restricoes_select_authenticated on public.restricoes;
create policy restricoes_select_authenticated on public.restricoes
for select to authenticated
using (ativa or (select public.has_role(auth.uid(), 'admin'::public.app_role)));

drop policy if exists restricoes_admin_manage on public.restricoes;
create policy restricoes_admin_manage on public.restricoes
for all to authenticated
using ((select public.has_role(auth.uid(), 'admin'::public.app_role)))
with check ((select public.has_role(auth.uid(), 'admin'::public.app_role)));

drop policy if exists publicacoes_select_owner_admin on public.publicacoes;
create policy publicacoes_select_owner_admin on public.publicacoes
for select to authenticated
using (anunciante_id = (select auth.uid()) or (select public.has_role(auth.uid(), 'admin'::public.app_role)));

drop policy if exists publicacoes_insert_anunciante on public.publicacoes;
create policy publicacoes_insert_anunciante on public.publicacoes
for insert to authenticated
with check (
  anunciante_id = (select auth.uid())
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
  and status = 'rascunho'
);

drop policy if exists publicacoes_update_own_draft on public.publicacoes;
create policy publicacoes_update_own_draft on public.publicacoes
for update to authenticated
using (
  anunciante_id = (select auth.uid())
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
  and status = 'rascunho'
)
with check (
  anunciante_id = (select auth.uid())
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
  and status = 'rascunho'
);

drop policy if exists publicacoes_admin_manage on public.publicacoes;
create policy publicacoes_admin_manage on public.publicacoes
for all to authenticated
using ((select public.has_role(auth.uid(), 'admin'::public.app_role)))
with check ((select public.has_role(auth.uid(), 'admin'::public.app_role)));

drop policy if exists rodadas_validacao_select_owner_admin on public.rodadas_validacao;
create policy rodadas_validacao_select_owner_admin on public.rodadas_validacao
for select to authenticated
using (
  exists (
    select 1 from public.publicacoes p
    where p.id = rodadas_validacao.publicacao_id
      and (p.anunciante_id = (select auth.uid()) or (select public.has_role(auth.uid(), 'admin'::public.app_role)))
  )
);

revoke all on public.restricoes, public.publicacoes, public.rodadas_validacao from anon, authenticated;
grant select on public.restricoes, public.publicacoes, public.rodadas_validacao to authenticated;
grant insert, update on public.publicacoes to authenticated;

-- Bucket público para exibir criativos aos Validadores nas próximas fases.
-- Escrita continua restrita à pasta do próprio Anunciante.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('criativos-publicacoes', 'criativos-publicacoes', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists criativos_public_read on storage.objects;
create policy criativos_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'criativos-publicacoes');

drop policy if exists criativos_owner_insert on storage.objects;
create policy criativos_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'criativos-publicacoes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
);

drop policy if exists criativos_owner_update on storage.objects;
create policy criativos_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'criativos-publicacoes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
)
with check (
  bucket_id = 'criativos-publicacoes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
);

drop policy if exists criativos_owner_delete on storage.objects;
create policy criativos_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'criativos-publicacoes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.has_role(auth.uid(), 'anunciante'::public.app_role))
);

-- A regra de restricoes tambem e aplicada no banco: a interface nao e a fronteira de seguranca.
create or replace function private.validar_restricao_publicacao()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_nome text;
  v_ativa boolean;
  v_exige_revisao boolean;
begin
  if (select public.has_role(auth.uid(), 'admin'::public.app_role)) then
    return new;
  end if;

  if auth.uid() is null
    or new.anunciante_id <> auth.uid()
    or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
    raise exception 'Somente o Anunciante titular pode salvar esta publicacao.';
  end if;

  if tg_op = 'UPDATE'
    and old.revisao_admin_pendente
    and old.restricao_id is not null
    and new.restricao_id is distinct from old.restricao_id then
    raise exception 'Uma publicacao encaminhada para revisao nao pode remover a restricao antes da analise do Admin.';
  end if;

  if new.restricao_id is null then
    new.revisao_admin_pendente := false;
    return new;
  end if;

  select nome, ativa, exige_revisao
    into v_nome, v_ativa, v_exige_revisao
  from public.restricoes
  where id = new.restricao_id;

  if v_nome is null or not v_ativa then
    raise exception 'A restricao selecionada nao esta disponivel.';
  end if;

  if v_nome ~* 'cassino|multin[ií]vel|mmn' then
    raise exception 'Produtos de cassino e marketing multinivel nao sao permitidos.';
  end if;

  if v_nome ~* 'criptomoedas' then
    if not new.produto_eh_curso then
      raise exception 'Produtos de criptomoedas so podem prosseguir quando forem cursos educacionais.';
    end if;
    new.revisao_admin_pendente := true;
  else
    new.revisao_admin_pendente := v_exige_revisao;
  end if;

  return new;
end;
$$;

revoke all on function private.validar_restricao_publicacao() from public, anon, authenticated;

drop trigger if exists validar_restricao_publicacao on public.publicacoes;
create trigger validar_restricao_publicacao
before insert or update of anunciante_id, restricao_id, produto_eh_curso, revisao_admin_pendente
on public.publicacoes
for each row execute function private.validar_restricao_publicacao();

create or replace function public.estimar_validadores_disponiveis(p_categoria_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_total integer;
begin
  if auth.uid() is null or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
    raise exception 'Somente Anunciantes autenticados podem consultar esta estimativa.';
  end if;

  if not exists (select 1 from public.categorias where id = p_categoria_id and ativa = true) then
    raise exception 'Categoria indisponivel.';
  end if;

  select count(distinct cv.usuario_id)::integer into v_total
  from public.cadastro_validadores cv
  where cv.maior_de_18 = true
    and cv.consentimento_lgpd_interesses = true
    and exists (select 1 from public.user_roles ur where ur.user_id = cv.usuario_id and ur.role = 'validador')
    and exists (select 1 from public.aceites_contrato ac where ac.usuario_id = cv.usuario_id)
    and exists (select 1 from public.documentos_usuarios du where du.usuario_id = cv.usuario_id and du.tipo_documento = 'cpf')
    and exists (select 1 from public.contas_pix cp where cp.usuario_id = cv.usuario_id and cp.aprovado = true)
    and exists (select 1 from public.contas_sociais cs where cs.usuario_id = cv.usuario_id and cs.canal = 'instagram' and cs.status = 'aprovada')
    and exists (select 1 from public.interesses_validador iv where iv.usuario_id = cv.usuario_id and iv.categoria_id = p_categoria_id)
    and (select count(*) from public.interesses_validador ivc where ivc.usuario_id = cv.usuario_id) between 3 and 8;

  return coalesce(v_total, 0);
end;
$$;

create or replace function public.obter_pacote_validacao_minimo()
returns numeric
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_valor numeric(14,2);
begin
  if auth.uid() is null or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
    raise exception 'Somente Anunciantes autenticados podem consultar o pacote minimo.';
  end if;
  select greatest(coalesce(valor::numeric, 100), 0.01) into v_valor
  from public.configuracoes
  where chave = 'pacote_validacao_minimo';
  return coalesce(v_valor, 100);
end;
$$;

create or replace function public.duplicar_publicacao(p_publicacao_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_origem public.publicacoes;
  v_nova_id uuid;
begin
  if auth.uid() is null or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
    raise exception 'Somente Anunciantes autenticados podem duplicar publicacoes.';
  end if;

  select * into v_origem
  from public.publicacoes
  where id = p_publicacao_id
    and anunciante_id = auth.uid()
  for share;

  if v_origem.id is null then
    raise exception 'Publicacao nao encontrada.';
  end if;

  insert into public.publicacoes (
    anunciante_id, categoria_id, publico_alvo, imagem_url, legenda, link,
    preco, oferta, versao, status, restricao_id, produto_eh_curso,
    revisao_admin_pendente
  )
  values (
    auth.uid(), v_origem.categoria_id, v_origem.publico_alvo, v_origem.imagem_url,
    v_origem.legenda, v_origem.link, v_origem.preco, v_origem.oferta,
    v_origem.versao + 1, 'rascunho', v_origem.restricao_id,
    v_origem.produto_eh_curso, v_origem.revisao_admin_pendente
  )
  returning id into v_nova_id;

  return v_nova_id;
end;
$$;

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
begin
  if auth.uid() is null or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
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
  if exists (select 1 from public.rodadas_validacao rv where rv.publicacao_id = p_publicacao_id and rv.status = 'em_andamento') then
    raise exception 'Ja existe uma rodada em andamento para esta publicacao.';
  end if;

  v_valor := greatest(coalesce((
    select valor::numeric from public.configuracoes where chave = 'pacote_validacao_minimo'
  ), 100), 0.01);
  v_estimativa := public.estimar_validadores_disponiveis(v_publicacao.categoria_id);

  if v_estimativa < 1 then
    raise exception 'Nao ha Validadores aprovados disponiveis nesta categoria no momento.';
  end if;

  perform public.reservar_pacote(v_valor, p_publicacao_id);

  insert into public.rodadas_validacao (
    publicacao_id, quantidade_contratada, quantidade_concluida, valor_reservado, status
  )
  values (p_publicacao_id, v_estimativa, 0, v_valor, 'em_andamento')
  returning id into v_rodada_id;

  update public.publicacoes
  set status = 'em_validacao', atualizado_em = now()
  where id = p_publicacao_id;

  return query select v_rodada_id, v_estimativa, v_valor;
end;
$$;

revoke all on function public.estimar_validadores_disponiveis(uuid) from public, anon;
revoke all on function public.obter_pacote_validacao_minimo() from public, anon;
revoke all on function public.duplicar_publicacao(uuid) from public, anon;
revoke all on function public.iniciar_rodada_validacao(uuid) from public, anon;
grant execute on function public.estimar_validadores_disponiveis(uuid) to authenticated;
grant execute on function public.obter_pacote_validacao_minimo() to authenticated;
grant execute on function public.duplicar_publicacao(uuid) to authenticated;
grant execute on function public.iniciar_rodada_validacao(uuid) to authenticated;
