insert into public.canais(slug,nome) values ('facebook','Facebook') on conflict (slug) do nothing;
insert into public.tipos_tarefa(canal_id,acao,nome,valor_validador,metodo_verificacao)
select c.id,'comentar_publicacao',x.nome,0.10,'token_lista' from public.canais c
join (values ('facebook','Comentar publicação no Facebook'),('youtube','Comentar vídeo no YouTube')) x(slug,nome) on x.slug=c.slug
where not exists (select 1 from public.tipos_tarefa t where t.canal_id=c.id and t.metodo_verificacao='token_lista');

create or replace function public.criar_tarefa_real(p_publicacao_id uuid, p_tipo_tarefa_id uuid, p_link_publicacao text, p_vagas integer)
returns uuid language plpgsql security definer set search_path = public, auth, extensions, pg_temp as $$
declare
  v_publicacao public.publicacoes; v_tipo public.tipos_tarefa; v_slug text; v_tarefa_id uuid;
  v_comissao_pct numeric(8,4); v_custo_unitario numeric(14,2); v_total_reservado numeric(14,2);
begin
  if auth.uid() is null or not (select public.has_role(auth.uid(), 'anunciante'::public.app_role)) then
    raise exception 'Somente Anunciantes autenticados podem criar tarefas reais.';
  end if;
  if p_vagas is null or p_vagas < 1 or p_vagas > 10000 then
    raise exception 'Informe uma quantidade de vagas entre 1 e 10000.';
  end if;
  select * into v_publicacao from public.publicacoes where id = p_publicacao_id and anunciante_id = auth.uid() for update;
  if v_publicacao.id is null or v_publicacao.status <> 'aprovada' or v_publicacao.revisao_admin_pendente then
    raise exception 'A tarefa exige uma publicacao aprovada e sem revisao pendente.';
  end if;
  select tt.* into v_tipo from public.tipos_tarefa tt join public.canais c on c.id = tt.canal_id
  where tt.id = p_tipo_tarefa_id and tt.ativo and c.ativo and c.slug in ('instagram','facebook','youtube') and tt.metodo_verificacao = 'token_lista';
  if v_tipo.id is null then raise exception 'Tipo de tarefa indisponivel para esta rede.'; end if;
  select slug into v_slug from public.canais where id = v_tipo.canal_id;
  if p_link_publicacao is null or not (
    (v_slug='instagram' and p_link_publicacao ~* '^https://(www\.)?instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+') or
    (v_slug='facebook' and p_link_publicacao ~* '^https://((www|m|web)\.)?(facebook\.com|fb\.watch)/.+') or
    (v_slug='youtube' and p_link_publicacao ~* '^https://((www|m)\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[A-Za-z0-9_-]{6,}')) then
    raise exception 'Informe o link publico da publicacao real na rede escolhida.';
  end if;
  insert into public.tarefas (publicacao_id, tipo_tarefa_id, categoria_id, vagas, link_destino, tempo_estimado_minutos, status, is_demo)
  values (v_publicacao.id, v_tipo.id, v_publicacao.categoria_id, p_vagas, trim(p_link_publicacao), 5, 'ativa', false) returning id into v_tarefa_id;
  select coalesce(valor::numeric, 35) into v_comissao_pct from public.configuracoes where chave = 'comissao_percentual';
  if v_comissao_pct < 0 or v_comissao_pct >= 100 then raise exception 'Percentual de comissao invalido.'; end if;
  v_custo_unitario := round(v_tipo.valor_validador, 2) + round(v_tipo.valor_validador * v_comissao_pct / (100 - v_comissao_pct), 2);
  v_total_reservado := round(v_custo_unitario * p_vagas, 2);
  perform public.reservar_pacote(v_total_reservado, v_tarefa_id);
  update public.tarefas set valor_reservado = v_total_reservado where id = v_tarefa_id;
  insert into public.auditoria (usuario_id, acao, entidade, dados) values (auth.uid(), 'tarefa_real_criada', 'tarefas',
    jsonb_build_object('tarefa_id', v_tarefa_id, 'publicacao_id', v_publicacao.id, 'vagas', p_vagas, 'canal', v_slug));
  return v_tarefa_id;
end; $$;
revoke all on function public.criar_tarefa_real(uuid,uuid,text,integer) from public, anon;
grant execute on function public.criar_tarefa_real(uuid,uuid,text,integer) to authenticated;