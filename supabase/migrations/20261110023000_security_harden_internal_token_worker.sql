-- Security hardening: internal expiry worker must not be callable as an authenticated RPC.
revoke execute on function public.processar_chamados_token_expirados()
  from authenticated;
grant execute on function public.processar_chamados_token_expirados()
  to service_role;
