-- Fase 3: dados complementares do cadastro, aceite e verificacoes.
-- Todos os dados pessoais ficam restritos ao titular e ao Admin.

create table if not exists public.aceites_contrato (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  versao text not null,
  aceito_em timestamptz not null default now(),
  ip inet,
  unique (usuario_id, versao)
);

create table if not exists public.documentos_usuarios (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  tipo_documento text not null check (tipo_documento in ('cpf', 'cnpj')),
  documento text not null,
  documento_normalizado text generated always as (regexp_replace(documento, '[^0-9]', '', 'g')) stored,
  criado_em timestamptz not null default now(),
  constraint documentos_usuarios_tamanho_check check (
    (tipo_documento = 'cpf' and length(regexp_replace(documento, '[^0-9]', '', 'g')) = 11)
    or (tipo_documento = 'cnpj' and length(regexp_replace(documento, '[^0-9]', '', 'g')) = 14)
  )
);
create unique index if not exists documentos_usuarios_documento_unique
  on public.documentos_usuarios (tipo_documento, documento_normalizado);

-- O tipo de documento é validado no banco, não apenas pela interface.
create or replace function public.validar_documento_por_papel()
returns trigger
language plpgsql
security invoker
set search_path = public
as $
begin
  if new.usuario_id <> (select auth.uid()) then
    if not (select private.has_role('admin'::app_role)) then
      raise exception 'Não é permitido cadastrar documento para outro usuário.';
    end if;
  end if;

  if (select private.has_role('validador'::app_role)) and new.tipo_documento <> 'cpf' then
    raise exception 'O cadastro de Validador exige CPF.';
  end if;

  if not (select private.has_role('validador'::app_role))
     and not (select private.has_role('anunciante'::app_role))
     and not (select private.has_role('admin'::app_role)) then
    raise exception 'Perfil sem permissão para cadastrar documento.';
  end if;

  return new;
end;
$;

drop trigger if exists validar_documento_por_papel_trigger on public.documentos_usuarios;
create trigger validar_documento_por_papel_trigger
before insert or update on public.documentos_usuarios
for each row execute function public.validar_documento_por_papel();

create table if not exists public.cadastro_validadores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  telefone text not null,
  telefone_verificado boolean not null default false,
  maior_de_18 boolean not null default false,
  consentimento_lgpd_interesses boolean not null default false,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cadastro_anunciantes (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome_empresa text not null,
  telefone text not null,
  tipo_produto text not null,
  maior_de_18 boolean not null default false,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.interesses_validador (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, categoria_id)
);

create table if not exists public.contas_pix (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  tipo_chave text not null check (tipo_chave in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  chave text not null,
  titular_nome text not null,
  titular_cpf text not null,
  titular_cpf_normalizado text generated always as (regexp_replace(titular_cpf, '[^0-9]', '', 'g')) stored,
  aprovado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  constraint contas_pix_cpf_tamanho_check check (length(regexp_replace(titular_cpf, '[^0-9]', '', 'g')) = 11)
);
create unique index if not exists contas_pix_titular_cpf_unique
  on public.contas_pix (titular_cpf_normalizado);

create table if not exists public.contas_sociais (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  canal text not null check (canal = 'instagram'),
  handle text not null,
  data_primeira_postagem date not null,
  imagem_url text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  observacao_admin text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, canal)
);

-- CPF informado no Pix deve corresponder ao CPF cadastrado pelo Validador.
create or replace function public.validar_cpf_pix_do_validador()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  _documento text;
begin
  select documento_normalizado into _documento
  from public.documentos_usuarios
  where usuario_id = new.usuario_id and tipo_documento = 'cpf';

  if _documento is null or _documento <> new.titular_cpf_normalizado then
    raise exception 'O CPF do titular da conta Pix deve ser igual ao CPF cadastrado.';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_cpf_pix_do_validador_trigger on public.contas_pix;
create trigger validar_cpf_pix_do_validador_trigger
before insert or update of titular_cpf, usuario_id on public.contas_pix
for each row execute function public.validar_cpf_pix_do_validador();

alter table public.aceites_contrato enable row level security;
alter table public.documentos_usuarios enable row level security;
alter table public.cadastro_validadores enable row level security;
alter table public.cadastro_anunciantes enable row level security;
alter table public.interesses_validador enable row level security;
alter table public.contas_pix enable row level security;
alter table public.contas_sociais enable row level security;

create policy "aceites_contrato_select_owner_admin" on public.aceites_contrato
for select to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));
create policy "aceites_contrato_insert_owner" on public.aceites_contrato
for insert to authenticated
with check (usuario_id = (select auth.uid()));
create policy "aceites_contrato_update_owner" on public.aceites_contrato
for update to authenticated
using (usuario_id = (select auth.uid()))
with check (usuario_id = (select auth.uid()));

create policy "documentos_usuarios_select_owner_admin" on public.documentos_usuarios
for select to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));
create policy "documentos_usuarios_insert_owner" on public.documentos_usuarios
for insert to authenticated
with check (usuario_id = (select auth.uid()));
create policy "documentos_usuarios_update_owner" on public.documentos_usuarios
for update to authenticated
using (usuario_id = (select auth.uid()))
with check (usuario_id = (select auth.uid()));

create policy "cadastro_validadores_owner_admin" on public.cadastro_validadores
for all to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
with check (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

create policy "cadastro_anunciantes_owner_admin" on public.cadastro_anunciantes
for all to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
with check (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

create policy "interesses_validador_owner_admin" on public.interesses_validador
for all to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
with check (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

create policy "contas_pix_owner_admin" on public.contas_pix
for all to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)))
with check (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));

create policy "contas_sociais_select_owner_admin" on public.contas_sociais
for select to authenticated
using (usuario_id = (select auth.uid()) or (select private.has_role('admin'::app_role)));
create policy "contas_sociais_insert_owner_pending" on public.contas_sociais
for insert to authenticated
with check (usuario_id = (select auth.uid()) and status = 'pendente');
create policy "contas_sociais_update_owner_pending" on public.contas_sociais
for update to authenticated
using (usuario_id = (select auth.uid()) and status = 'pendente')
with check (usuario_id = (select auth.uid()) and status = 'pendente');
create policy "contas_sociais_admin_update" on public.contas_sociais
for update to authenticated
using ((select private.has_role('admin'::app_role)))
with check ((select private.has_role('admin'::app_role)));

grant select, insert, update on public.aceites_contrato to authenticated;
grant select, insert, update on public.documentos_usuarios to authenticated;
grant select, insert, update, delete on public.cadastro_validadores to authenticated;
grant select, insert, update, delete on public.cadastro_anunciantes to authenticated;
grant select, insert, update, delete on public.interesses_validador to authenticated;
grant select, insert, update, delete on public.contas_pix to authenticated;
grant select, insert, update on public.contas_sociais to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificacoes-instagram', 'verificacoes-instagram', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "instagram_upload_own_folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'verificacoes-instagram' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "instagram_read_owner_admin" on storage.objects
for select to authenticated
using (bucket_id = 'verificacoes-instagram' and (
  (storage.foldername(name))[1] = (select auth.uid())::text
  or (select private.has_role('admin'::app_role))
));
