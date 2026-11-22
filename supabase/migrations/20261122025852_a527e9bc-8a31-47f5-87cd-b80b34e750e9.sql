drop policy verificacoes_seguranca_admin_insert on public.verificacoes_seguranca;

create or replace function public.validar_verificacao_seguranca_automatica()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if current_setting('tarefa_play.verificacao_automatica', true) is distinct from 'on' then
    raise exception 'Registros de segurança só podem ser criados pela verificação automática.';
  end if;

  if new.registrado_por is distinct from auth.uid() then
    raise exception 'O responsável pelo registro deve ser o administrador autenticado.';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_verificacao_seguranca_automatica() from public, anon, authenticated;

create trigger validar_verificacao_seguranca_automatica
before insert on public.verificacoes_seguranca
for each row execute function public.validar_verificacao_seguranca_automatica();

create policy verificacoes_seguranca_admin_insert
on public.verificacoes_seguranca
for insert to authenticated
with check (
  (select private.has_role('admin'::public.app_role))
  and registrado_por = auth.uid()
);

create or replace function public.executar_verificacoes_seguranca()
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  tabelas_sem_rls text;
  tabelas_sem_politica text;
begin
  if not (select private.has_role('admin'::public.app_role)) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  perform set_config('tarefa_play.verificacao_automatica', 'on', true);

  select string_agg(t.tablename, ', ' order by t.tablename)
  into tabelas_sem_rls
  from pg_catalog.pg_tables t
  where t.schemaname = 'public'
    and not t.rowsecurity;

  insert into public.verificacoes_seguranca (titulo, status, observacoes, registrado_por)
  values (
    'Proteção por RLS nas tabelas do aplicativo',
    case when tabelas_sem_rls is null then 'conforme' else 'atencao' end,
    case
      when tabelas_sem_rls is null then 'Todas as tabelas do aplicativo possuem RLS ativado.'
      else 'Tabelas sem RLS ativado: ' || tabelas_sem_rls
    end,
    auth.uid()
  );

  with tabelas_protegidas as (
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  )
  select string_agg(t.relname, ', ' order by t.relname)
  into tabelas_sem_politica
  from tabelas_protegidas t
  where not exists (
    select 1
    from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and p.tablename = t.relname
  );

  insert into public.verificacoes_seguranca (titulo, status, observacoes, registrado_por)
  values (
    'Políticas de acesso das tabelas do aplicativo',
    case when tabelas_sem_politica is null then 'conforme' else 'atencao' end,
    case
      when tabelas_sem_politica is null then 'Todas as tabelas com RLS possuem políticas de acesso.'
      else 'Tabelas sem políticas: ' || tabelas_sem_politica || '. O acesso direto permanece bloqueado; revise se essa restrição é intencional.'
    end,
    auth.uid()
  );
end;
$$;

revoke all on function public.executar_verificacoes_seguranca() from public, anon;
grant execute on function public.executar_verificacoes_seguranca() to authenticated, service_role;