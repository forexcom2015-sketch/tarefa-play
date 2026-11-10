-- Internal financial helpers are invoked by SECURITY DEFINER workflows.
-- They are not intended as direct authenticated RPC endpoints.
-- Their owner (postgres) retains EXECUTE, so nested calls from the approved
-- SECURITY DEFINER functions continue to work.

revoke all on function public.pagar_tarefa(uuid, uuid, numeric, uuid)
  from public, anon, authenticated;
grant execute on function public.pagar_tarefa(uuid, uuid, numeric, uuid)
  to service_role;

revoke all on function public.reservar_pacote(numeric, uuid)
  from public, anon, authenticated;
grant execute on function public.reservar_pacote(numeric, uuid)
  to service_role;
