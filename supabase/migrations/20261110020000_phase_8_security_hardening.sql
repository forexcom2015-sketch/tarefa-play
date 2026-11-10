-- Fase 8 security hardening: lock direct token access and internal RPCs.

-- The application never grants direct table access to tokens_tarefa; keep a
-- restrictive RLS policy so the table is not left without policies while
-- SECURITY DEFINER RPCs continue to own the token workflow.
drop policy if exists tokens_tarefa_select_owner on public.tokens_tarefa;
create policy tokens_tarefa_select_owner
on public.tokens_tarefa
for select
to authenticated
using (
  exists (
    select 1
    from public.habilitacoes h
    where h.id = tokens_tarefa.habilitacao_id
      and h.validador_id = (select auth.uid())
  )
);

-- These routines are administrative/backend routines and must not be exposed
-- as authenticated RPC endpoints.
revoke execute on function public.creditar_bonus_indicacao(uuid,numeric,uuid)
  from authenticated;
revoke execute on function public.processar_habilitacoes_expiradas()
  from authenticated;

grant execute on function public.creditar_bonus_indicacao(uuid,numeric,uuid)
  to service_role;
grant execute on function public.processar_habilitacoes_expiradas()
  to service_role;
