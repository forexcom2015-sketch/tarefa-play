import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Chamado = {
  id: string; motivo: string; link_comentario: string; evidencia: string | null;
  status: string; prazo: string; resposta_anunciante: string | null;
  habilitacoes?: {
    handle: string; validador_id: string;
    tarefas?: {
      tokens_exportados_em: string | null;
      publicacoes?: { legenda: string } | null;
      tipos_tarefa?: { nome: string; valor_validador: number | string } | null;
    } | null;
  } | null;
};

const db = supabase as any;
const dataHora = (valor: string) => new Date(valor).toLocaleString("pt-BR");

export const Route = createFileRoute("/admin/chamados-token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Chamados de token — Admin — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: ChamadosTokenAdmin,
});

function ChamadosTokenAdmin() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    const { error: escalonamentoError } = await db.rpc("processar_chamados_token_expirados");
    const { data, error } = await db.from("chamados_token")
      .select("id,motivo,link_comentario,evidencia,status,prazo,resposta_anunciante,habilitacoes(handle,validador_id,tarefas(tokens_exportados_em,publicacoes(legenda),tipos_tarefa(nome,valor_validador)))")
      .in("status", ["aguardando_anunciante", "em_suporte"])
      .order("prazo", { ascending: true });
    if (error || escalonamentoError) setErro("Não foi possível carregar a fila de chamados. Confirme se a migration da Fase 8 está aplicada.");
    else setChamados((data ?? []) as Chamado[]);
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function decidir(ticket: Chamado, decisao: "pagar" | "indeferir") {
    const observacao = (observacoes[ticket.id] ?? "").trim();
    if (observacao.length < 10) { setErro("Informe uma justificativa com pelo menos 10 caracteres."); return; }
    if (ticket.status !== "em_suporte") { setErro("O chamado ainda está no prazo do Anunciante."); return; }
    const listaNaoExportada = !ticket.habilitacoes?.tarefas?.tokens_exportados_em;
    if (listaNaoExportada && decisao !== "pagar") {
      setErro("A lista não foi exportada. O pagamento ao Validador é obrigatório.");
      return;
    }
    setProcessando(ticket.id); setErro(""); setMensagem("");
    const { error } = await db.rpc("resolver_chamado_token", {
      p_chamado_id: ticket.id,
      p_decisao: decisao,
      p_observacao: observacao,
    });
    setProcessando(null);
    if (error) setErro(error.message || "Não foi possível registrar a decisão.");
    else { setMensagem(decisao === "pagar" ? "Pagamento ao Validador registrado e chamado resolvido." : "Chamado indeferido com justificativa."); await carregar(); }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-foreground">Suporte · Chamados de token</h2><p className="mt-1 text-sm text-muted-foreground">O Anunciante tem 24 horas para resolver. Depois, o chamado entra nesta fila e o suporte tem até 48 horas para decidir.</p></div>
        <Button variant="outline" onClick={() => void carregar()}>Atualizar fila</Button>
      </header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">{mensagem}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando chamados...</p> : chamados.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhum chamado na fila.</p> : chamados.map((ticket) => {
        const listaNaoExportada = !ticket.habilitacoes?.tarefas?.tokens_exportados_em;
        return <article key={ticket.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 className="font-semibold text-foreground">{ticket.habilitacoes?.handle ?? "Validador"}</h3><p className="text-xs text-muted-foreground">{ticket.habilitacoes?.tarefas?.tipos_tarefa?.nome ?? "Tarefa Instagram"} · {ticket.habilitacoes?.tarefas?.publicacoes?.legenda?.slice(0, 140) ?? "Publicação"}</p></div>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">{ticket.status}</span>
          </div>
          <p className="text-sm">{ticket.motivo}</p>
          <div className="flex flex-wrap gap-3 text-xs"><a href={ticket.link_comentario} target="_blank" rel="noreferrer" className="text-primary underline">Ver comentário</a>{ticket.evidencia && <a href={ticket.evidencia} target="_blank" rel="noreferrer" className="text-primary underline">Ver evidência</a>}</div>
          {ticket.resposta_anunciante && <p className="rounded-md bg-muted p-3 text-sm">Resposta do Anunciante: {ticket.resposta_anunciante}</p>}
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p>Prazo atual: {dataHora(ticket.prazo)}</p><p>Lista exportada: {ticket.habilitacoes?.tarefas?.tokens_exportados_em ? dataHora(ticket.habilitacoes.tarefas.tokens_exportados_em) : "Não"}</p></div>
          {ticket.status === "em_suporte" ? <>
            {listaNaoExportada && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-medium text-foreground">A lista de tokens não foi exportada. Pela regra da Fase 8, o pagamento ao Validador é obrigatório com o saldo já reservado.</p>}
            <label className="block space-y-1 text-sm">Justificativa da decisão
              <textarea rows={3} minLength={10} value={observacoes[ticket.id] ?? ""} onChange={(e) => setObservacoes((atual) => ({ ...atual, [ticket.id]: e.target.value }))} className="w-full rounded-md border border-input bg-background p-3" placeholder="Registre o que foi conferido no link do comentário..." />
            </label>
            <div className="flex flex-wrap gap-2"><Button disabled={processando !== null} onClick={() => void decidir(ticket, "pagar")}>{processando === ticket.id ? "Salvando..." : "Aprovar pagamento"}</Button><Button variant="outline" disabled={processando !== null || listaNaoExportada} onClick={() => void decidir(ticket, "indeferir")}>Indeferir chamado</Button></div>
          </> : <p className="text-xs text-muted-foreground">Aguardando o prazo de 24 horas do Anunciante terminar. O escalonamento é processado pela rotina da Fase 8.</p>}
        </article>;
      })}
    </section>
  );
}
