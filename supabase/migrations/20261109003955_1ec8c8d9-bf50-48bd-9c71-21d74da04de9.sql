revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
drop policy "categorias read" on public.categorias;
create policy "categorias read anon" on public.categorias for select to anon using (ativa);
create policy "categorias read auth" on public.categorias for select to authenticated using (ativa or public.has_role(auth.uid(),'admin'));