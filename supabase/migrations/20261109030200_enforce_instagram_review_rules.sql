-- A aprovação do Instagram é exclusiva do Admin e exige primeira postagem há mais de 6 meses.
create or replace function public.validar_aprovacao_conta_social()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status in ('aprovada', 'rejeitada') and not (select private.has_role('admin'::app_role)) then
    raise exception 'Somente a administração pode revisar a conta social.';
  end if;

  if new.status = 'aprovada' and new.data_primeira_postagem > (current_date - interval '6 months')::date then
    raise exception 'A primeira postagem precisa ter mais de 6 meses para aprovação.';
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists validar_aprovacao_conta_social_trigger on public.contas_sociais;
create trigger validar_aprovacao_conta_social_trigger
before insert or update on public.contas_sociais
for each row execute function public.validar_aprovacao_conta_social();
