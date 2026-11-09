import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Publicacao = { id: string; legenda: string; status: string };
type TipoTarefa = { id: string; nome: string; valor_validador: number | string };
type Tarefa = {
  id: string; publicacao_id: string; vagas: number; vagas_ocupadas: number;
  vagas_concluidas: number; link_destino: string; status: string;
  valor_reservado: number | string; publicacoes?: { legenda: string } | null;
  tipos_tarefa?: { nome: string; valor_validador: number | string } | null;
};
type Habilitacao = {
  habilitacao_id: string; handle: string; status: string; expira_em: string;
  token_status: string | null; token_expira_em: string | null;
};
type TokenGerado = { habilitacao_id: string; handle: string; codigo: string; expira_em: string };
type Chamado = {
  id: string; motivo: string; link_comentario: string; evidencia: string | null;
  status: string; prazo: string; resposta_anunciante: string | null;
  habilitacoes?: { handle: string; tarefas?: { publicacao_id: string } | null } | null;
};

const db = supabase as any;
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));
const dataHora = (valor: string) => new Date(valor).toLocaleString("pt-BR");

export const Route = createFileRoute("/anunciante/tarefas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Tarefas reais — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: TarefasReais,
});

function TarefasReais() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [tipos, setTipos] = useState<TipoTarefa[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [habilitacoes, setHabilitacoes] = useState<Record<string, Habilitacao[]>>({});
  const [tokens, setTokens] = useState<Record<string, TokenGerado[]>>({});
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [publicacaoId, setPublicacaoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [link, setLink] = useState("");
  const [vagas, setVagas] = useState("10");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    await db.rpc("processar_chamados_token_expirados");
    const [pubs, tiposResult, tasks, tickets] = await Promise.all([
      db.from("publicacoes").select("id,legenda,status").eq("status", "aprovada").eq("revisao_admin_pendente", false).order("atualizado_em", { ascending: false }),
      db.from("tipos_tarefa").select("id,nome,valor_validador,canais!inner(slug)").eq("ativo", true).eq("metodo_verificacao", "token_lista").eq("canais.slug", "instagram"),
      db.from("tarefas").select("id,publicacao_id,vagas,vagas_ocupadas,vagas_concluidas,link_destino,status,valor_reservado,publicacoes(legenda),tipos_tarefa(nome,valor_validador)").eq("is_demo", false).order("criado_em", { ascending: false }),
      db.rpc("listar_chamados_token_anunciante"),
    ]);
    const falha = pubs.error ?? tiposResult.error ?? tasks.error ?? tickets.error;
    if (falha) {
      setErro("Não foi possível carregar tarefas reais. Confirme se a migration da Fase 8 está aplicada no ambiente de desenvolvimento.");
      setCarregando(false);
      return;
    }
    const taskRows = (tasks.data ?? []) as Tarefa[];
    setPublicacoes((pubs.data ?? []) as Publicacao[]);
    setTipos((tiposResult.data ?? []) as TipoTarefa[]);
    setTarefas(taskRows);
    setChamados((tickets.data ?? []).map((item: any) => ({ ...item, id: item.chamado_id })) as Chamado[]);
    const lists = await Promise.all(taskRows.map(async (task) => {
      const { data, error } = await db.rpc("listar_habilitacoes_tarefa", { p_tarefa_id: task.id });
      return error ? [task.id, [] as Habilitacao[]] as const : [task.id, (data ?? []) as Habilitacao[]] as const;
    }));
    setHabilitacoes(Object.fromEntries(lists));
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function criarTarefa() {
    setErro(""); setMensagem("");
    if (!publicacaoId || !tipoId || !link.trim() || !Number.isInteger(Number(vagas)) || Number(vagas) < 1) {
      setErro("Selecione uma publicação aprovada, o tipo de tarefa, o link real do Instagram e a quantidade de vagas.");
      return;
    }
    setProcessando("criar");
    const { error } = await db.rpc("criar_tarefa_real", {
      p_publicacao_id: publicacaoId,
      p_tipo_tarefa_id: tipoId,
      p_link_publicacao: link.trim(),
      p_vagas: Number(vagas),
    });
    setProcessando(null);
    if (error) { setErro(error.message || "Não foi possível criar a tarefa."); return; }
    setMensagem("Tarefa criada e valor total das vagas reservado na carteira.");
    setPublicacaoId(""); setTipoId(""); setLink(""); setVagas("10");
    await carregar();
  }

  async function gerarTokens(tarefaId: string) {
    setErro(""); setMensagem(""); setProcessando(tarefaId);
    const { data, error } = await db.rpc("gerar_tokens_tarefa", { p_tarefa_id: tarefaId });
    setProcessando(null);
    if (error) { setErro(error.message || "Não foi possível gerar os tokens."); return; }
    const rows = (data ?? []) as TokenGerado[];
    setTokens((atual) => ({ ...atual, [tarefaId]: rows }));
    setMensagem(rows.length ? `${rows.length} tokens gerados. Copie ou exporte agora; o código puro não será exibido novamente depois que esta tela for fechada.` : "Ainda não há habilitações ativas e válidas para receber tokens.");
    await carregar();
  }

  async function marcarExportacao(tarefaId: string) {
    const { error } = await db.rpc("marcar_tokens_exportados", { p_tarefa_id: tarefaId });
    if (error) setErro(error.message || "Não foi possível registrar a exportação da lista.");
  }

  async function baixarCsv(tarefaId: string) {
    const rows = tokens[tarefaId] ?? [];
    if (!rows.length) return;
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ["@,codigo,expira_em", ...rows.map((row) => [row.handle, row.codigo, row.expira_em].map(quote).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `tarefa-play-tokens-${tarefaId.slice(0, 8)}.csv`;
    anchor.click(); URL.revokeObjectURL(url);
    await marcarExportacao(tarefaId);
    setMensagem("CSV exportado. Importe a lista na automação externa e envie cada código ao @ correspondente.");
  }

  async function copiarLista(tarefaId: string) {
    const rows = tokens[tarefaId] ?? [];
    if (!rows.length) return;
    const texto = rows.map((row) => `${row.handle},${row.codigo},${row.expira_em}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      await marcarExportacao(tarefaId);
      setMensagem("Lista copiada. Importe os pares @/código na automação externa.");
    } catch {
      setErro("Não foi possível copiar automaticamente. Use o botão de exportar CSV.");
    }
  }

  async function responderChamado(id: string) {
    const resposta = (respostas[id] ?? "").trim();
    if (resposta.length < 5) { setErro("Escreva uma resposta com pelo menos 5 caracteres."); return; }
    setProcessando(id); setErro("");
    const { error } = await db.rpc("responder_chamado_token", { p_chamado_id: id, p_resposta: resposta });
    setProcessando(null);
    if (error) setErro(error.message || "Não foi possível responder ao chamado.");
    else { setMensagem("Resposta registrada. O Validador poderá validar o código; o chamado permanece dentro do prazo de 24 horas até a resolução."); await carregar(); }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-foreground">Tarefas reais</h2><p className="mt-1 text-sm text-muted-foreground">Crie tarefas para publicações aprovadas, acompanhe os @ habilitados e gere códigos individuais.</p></div>
        <a href="/anunciante/automacao" className="text-sm font-semibold text-primary underline">Como configurar a automação</a>
      </header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}

      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-foreground">Criar tarefa de comentário no Instagram</h3>
        <p className="text-xs text-muted-foreground">Somente publicações aprovadas na validação interna podem originar tarefas reais. O valor de todas as vagas é reservado antes da abertura.</p>
        <label className="block space-y-1 text-sm">Publicação aprovada
          <select value={publicacaoId} onChange={(e) => setPublicacaoId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
            <option value="">Selecione</option>{publicacoes.map((p) => <option key={p.id} value={p.id}>{p.legenda.slice(0, 100)}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">Tipo de tarefa
          <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
            <option value="">Selecione</option>{tipos.map((t) => <option key={t.id} value={t.id}>{t.nome} · {moeda(t.valor_validador)} por Validador</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">Link da publicação real no Instagram
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.instagram.com/p/..." className="h-10 w-full rounded-md border border-input bg-background px-3" />
        </label>
        <label className="block max-w-xs space-y-1 text-sm">Quantidade de vagas
          <input type="number" min="1" max="10000" value={vagas} onChange={(e) => setVagas(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
        </label>
        <Button disabled={processando !== null || !publicacoes.length || !tipos.length} onClick={() => void criarTarefa()}>{processando === "criar" ? "Criando e reservando..." : "Criar tarefa e reservar valor"}</Button>
        {!publicacoes.length && <p className="text-xs text-muted-foreground">Nenhuma publicação aprovada disponível.</p>}
      </article>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Tarefas e Validadores habilitados</h3>
        {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando tarefas...</p> : tarefas.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma tarefa real criada.</p> : tarefas.map((task) => {
          const lista = habilitacoes[task.id] ?? [];
          const codigos = tokens[task.id] ?? [];
          return <article key={task.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><h4 className="font-semibold text-foreground">{task.tipos_tarefa?.nome ?? "Tarefa Instagram"}</h4><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.publicacoes?.legenda ?? "Publicação"}</p><a href={task.link_destino} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Abrir publicação real</a></div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{task.status}</span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <p>Vagas: <strong>{task.vagas}</strong></p><p>Habilitados: <strong>{lista.length}</strong></p><p>Concluídas: <strong>{task.vagas_concluidas}</strong></p><p>Reservado: <strong>{moeda(task.valor_reservado)}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2"><Button size="sm" disabled={processando !== null || !lista.some((h) => ["habilitado","em_andamento"].includes(h.status))} onClick={() => void gerarTokens(task.id)}>{processando === task.id ? "Gerando..." : "Gerar / renovar tokens"}</Button>{codigos.length > 0 && <><Button size="sm" variant="outline" onClick={() => void baixarCsv(task.id)}>Exportar CSV</Button><Button size="sm" variant="outline" onClick={() => void copiarLista(task.id)}>Copiar lista</Button></>}</div>
            {codigos.length > 0 && <p className="rounded-md bg-muted p-3 text-xs text-foreground">{codigos.length} códigos gerados. O texto puro aparece apenas nos botões de copiar ou exportar e não será recuperado depois desta sessão.</p>}
            <div className="space-y-1"><p className="text-xs font-semibold text-muted-foreground">Lista de @ habilitados</p>{lista.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum Validador se habilitou ainda.</p> : lista.map((h) => <p key={h.habilitacao_id} className="flex flex-wrap justify-between gap-2 text-xs"><span>{h.handle} · {h.status}</span><span className="text-muted-foreground">{h.token_status ? `Token: ${h.token_status}` : "Token ainda não gerado"}</span></p>)}</div>
          </article>;
        })}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Chamados de código não recebido</h3>
        {chamados.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhum chamado aguardando resposta.</p> : chamados.map((ticket) => <article key={ticket.id} className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><strong>{ticket.handle ?? "Validador"}</strong><span className="text-xs text-muted-foreground">{ticket.status} · prazo {dataHora(ticket.prazo)}</span></div>
          <p>{ticket.motivo}</p><a href={ticket.link_comentario} target="_blank" rel="noreferrer" className="text-primary underline">Ver comentário informado</a>
          {ticket.evidencia && <p className="break-all text-xs text-muted-foreground">Evidência: {ticket.evidencia}</p>}
          {ticket.status === "aguardando_anunciante" && <><textarea rows={2} value={respostas[ticket.id] ?? ""} onChange={(e) => setRespostas((atual) => ({ ...atual, [ticket.id]: e.target.value }))} placeholder="Informe que enviou o código ou explique a situação..." className="w-full rounded-md border border-input bg-background p-2" /><Button size="sm" disabled={processando === ticket.id} onClick={() => void responderChamado(ticket.id)}>{processando === ticket.id ? "Enviando..." : "Responder chamado"}</Button></>}
          {ticket.status === "em_suporte" && <p className="text-xs font-medium text-amber-700">Prazo do suporte: até 48 horas. A decisão será feita pelo Admin.</p>}
        </article>)}
      </div>
    </section>
  );
}
