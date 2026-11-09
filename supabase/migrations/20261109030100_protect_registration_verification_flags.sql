-- Impede que o próprio usuário marque verificações administrativas como aprovadas.
create or replace function public.proteger_status_verificacao_cadastro()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (auth.uid() = new.usuario_id and not (select private.has_role('admin'::app_role))) then
    if tg_table_name = 'cadastro_validadores' then
      new.telefone_verificado := false;
    elsif tg_table_name = 'contas_pix' then
      new.aprovado := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_telefone_verificado_trigger on public.cadastro_validadores;
create trigger proteger_telefone_verificado_trigger
before insert or update on public.cadastro_validadores
for each row execute function public.proteger_status_verificacao_cadastro();

drop trigger if exists proteger_pix_aprovado_trigger on public.contas_pix;
create trigger proteger_pix_aprovado_trigger
before insert or update on public.contas_pix
for each row execute function public.proteger_status_verificacao_cadastro();
