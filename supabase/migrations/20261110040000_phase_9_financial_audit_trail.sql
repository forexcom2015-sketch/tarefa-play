-- Phase 9: financial audit trail and audit-surface hardening.
-- Records financial mutations without storing Pix keys or CPF values in the audit payload.

create or replace function public.registrar_auditoria_financeira()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_antes jsonb;
  v_depois jsonb;
  v_entidade text := tg_table_name;
  v_id text;
begin
  if tg_op <> 'INSERT' then
    v_antes := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    v_depois := to_jsonb(new);
  end if;

  -- Never persist Pix keys or CPF values in the audit trail.
  if v_entidade = 'contas_pix' then
    v_antes := coalesce(v_antes, '{}'::jsonb)
      - 'chave' - 'titular_cpf' - 'titular_cpf_normalizado';
    v_depois := coalesce(v_depois, '{}'::jsonb)
      - 'chave' - 'titular_cpf' - 'titular_cpf_normalizado';
  end if;

  v_id := coalesce(v_depois->>'id', v_antes->>'id', v_depois->>'usuario_id', v_antes->>'usuario_id');

  insert into public.auditoria (usuario_id, acao, entidade, dados)
  values (
    auth.uid(),
    tg_op,
    v_entidade,
    jsonb_build_object(
      'origem', 'financeiro',
      'registro_id', v_id,
      'antes', case when tg_op <> 'INSERT' then v_antes end,
      'depois', case when tg_op <> 'DELETE' then v_depois end
    )
  );

  return coalesce(new, old);
end;
$function$;

revoke execute on function public.registrar_auditoria_financeira() from public, anon, authenticated, service_role;

drop trigger if exists auditoria_financeira_lancamentos on public.lancamentos;
create trigger auditoria_financeira_lancamentos
after insert or update or delete on public.lancamentos
for each row execute function public.registrar_auditoria_financeira();

drop trigger if exists auditoria_financeira_saques on public.saques;
create trigger auditoria_financeira_saques
after insert or update or delete on public.saques
for each row execute function public.registrar_auditoria_financeira();

drop trigger if exists auditoria_financeira_contas_pix on public.contas_pix;
create trigger auditoria_financeira_contas_pix
after insert or update or delete on public.contas_pix
for each row execute function public.registrar_auditoria_financeira();

-- The audit table is append-only from the application perspective.
revoke all on table public.auditoria from anon;
revoke insert, update, delete, truncate on table public.auditoria from authenticated;
grant select on table public.auditoria to authenticated;
