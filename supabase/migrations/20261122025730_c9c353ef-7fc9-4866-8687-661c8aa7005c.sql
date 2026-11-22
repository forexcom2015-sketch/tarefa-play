create table public.verificacoes_seguranca (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 160),
  status text not null check (status in ('conforme', 'pendente', 'atencao')),
  verificado_em timestamp with time zone not null default now(),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  registrado_por uuid not null default auth.uid(),
  criado_em timestamp with time zone not null default now()
);

grant select, insert on public.verificacoes_seguranca to authenticated;
grant all on public.verificacoes_seguranca to service_role;

alter table public.verificacoes_seguranca enable row level security;

create policy verificacoes_seguranca_admin_select
on public.verificacoes_seguranca
for select to authenticated
using ((select private.has_role('admin'::public.app_role)));

create policy verificacoes_seguranca_admin_insert
on public.verificacoes_seguranca
for insert to authenticated
with check (
  (select private.has_role('admin'::public.app_role))
  and registrado_por = auth.uid()
);

create trigger aud_verificacoes_seguranca
after insert on public.verificacoes_seguranca
for each row execute function public.registrar_auditoria();