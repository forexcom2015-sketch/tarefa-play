create policy criativos_read_autorizado
on storage.objects for select to authenticated
using (
  bucket_id = 'criativos-publicacoes'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.has_role('admin'::public.app_role))
    or exists (
      select 1
      from public.habilitacoes h
      join public.tarefas t on t.id = h.tarefa_id
      where h.validador_id = (select auth.uid())
        and (storage.foldername(name))[2] = t.publicacao_id::text
    )
  )
);