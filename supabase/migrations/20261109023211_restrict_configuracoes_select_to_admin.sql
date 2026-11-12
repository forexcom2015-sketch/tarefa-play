-- Restrict system configuration values to administrators only.
-- The admin dashboard is the only current application reader of this table.
drop policy if exists "config read" on public.configuracoes;

create policy "config admin select"
on public.configuracoes
for select
to authenticated
using ((select public.has_role(auth.uid(), 'admin'::public.app_role)));
