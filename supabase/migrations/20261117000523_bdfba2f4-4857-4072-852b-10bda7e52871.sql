grant usage on schema private to authenticated, service_role;
grant execute on function private.expirar_habilitacoes_validador() to authenticated, service_role;

create or replace function private.expirar_chamados_token()
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_total integer;
begin
  update public.chamados_token
  set status = 'em_suporte',
      prazo = now() + interval '48 hours',
      atualizado_em = now()
  where status = 'aguardando_anunciante'
    and prazo <= now();
  get diagnostics v_total = row_count;
  return v_total;
end;
$function$;

revoke all on function private.expirar_chamados_token() from public, anon;
grant execute on function private.expirar_chamados_token() to authenticated, service_role;

create or replace function public.processar_habilitacoes_expiradas()
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null
    or not (
      (select private.has_role('validador'::public.app_role))
      or (select private.has_role('admin'::public.app_role))
    ) then
    raise exception 'Acesso restrito a Validadores e Admin.';
  end if;
  return private.expirar_habilitacoes_validador();
end;
$function$;

create or replace function public.processar_chamados_token_expirados()
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if coalesce((select auth.jwt()->>'role'), '') <> 'service_role'
    and (
      (select auth.uid()) is null
      or not (
        (select private.has_role('admin'::public.app_role))
        or (select private.has_role('anunciante'::public.app_role))
        or (select private.has_role('validador'::public.app_role))
      )
    ) then
    raise exception 'Acesso restrito.';
  end if;
  return private.expirar_chamados_token();
end;
$function$;

revoke all on function public.processar_habilitacoes_expiradas() from public, anon;
revoke all on function public.processar_chamados_token_expirados() from public, anon;
grant execute on function public.processar_habilitacoes_expiradas() to authenticated, service_role;
grant execute on function public.processar_chamados_token_expirados() to authenticated, service_role;