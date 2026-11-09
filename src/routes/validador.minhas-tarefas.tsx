import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Habilitacao = {
  id: string;
  tarefa_id: string;
  handle: string;
  status: string;
  expira_em: string;
  validada_em: string | null;
  tarefas?: {
    link_destino: string | null;
    is_demo: boolean;
    categorias?: { nome: string } | null;
    tipos_tarefa?: { nome: string; valor_validador: number | string; canais?: { nome: string } | null } | null;
  } | null;
};

const db = supabase as any;
const statusLabel: Record<string, string> = {
  habilitado: "Habilitada",
  em_andamento: "Em andamento",
  validada: "Validada",
  expirada: "Expirada",
  desistiu: "Desistência",
  rejeitada: "Rejeitada",
};
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));

export const Route = createFileRoute("/validador/minhas-tarefas")({
  component: MinhasTarefas,
});

function MinhasTarefas() {
  const [itens, setItens] = useState<Habilitacao[]>([]);
  const [agora, setAgora] = useState(Date.now());
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const { error: expiracaoError } = await db.rpc("processar_habilitacoes_expiradas");
    if (expiracaoError) {
      setErro("Não foi possível atualizar as expirações. Confirme se a migration da Fase 5 está aplicada.");
      setCarregando(false);
      return;
    }
    const { data, error: listaError } = await db
      .from("habilitacoes")
      .select("id,tarefa_id,handle,status,expira_em,validada_em,tarefas(link_destino,is_demo,categorias(nome),tipos_tarefa(nome,valor_validador,canais(nome)))")
      .order("criado_em", { ascending: false });
    if (listaError) {
      setErro("Não foi possível carregar suas tarefas.");
      setItens([]);
    } else {
      setItens((data ?? []) as Habilitacao[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);
    const atualizacao = window.setInterval(() => void carregar(), 30000);
    return () => {
      window.clearInterval(relogio);
      window.clearInterval(atualizacao);
    };
  }, [carregar]);

  async function desistir(id: string) {
    setProcessando(id);
    setErro("");
    setMensagem("");
    const { error: desistirError } = await db.rpc("desistir_habilitacao", { p_habilitacao_id: id });
    setProcessando(null);
    if (desistirError) setErro(desistirError.message || "Não foi possível desistir desta tarefa.");
    else {
      setMensagem("Desistência registrada e vaga liberada.");
      await carregar();
    }
  }

  function restante(expiraEm: string) {
    const segundos = Math.max(0, Math.floor((new Date(expiraEm).getTime() - agora) / 1000));
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const seg = segundos % 60;
    return horas > 0 ? `${horas}h ${String(minutos).padStart(2, "0")}m ${String(seg).padStart(2, "0")}s` : `${minutos}m ${String(seg).padStart(2, "0")}s`;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Minhas tarefas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe suas habilitações, prazos e histórico.</p>
      </div>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando suas tarefas...</p> : itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Você ainda não reservou nenhuma tarefa.</p>
      ) : itens.map((item) => {
        const ativa = ["habilitado", "em_andamento"].includes(item.status);
        const expirouNoRelogio = new Date(item.expira_em).getTime() <= agora;
        return (
          <article key={item.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{item.tarefas?.tipos_tarefa?.nome ?? "Tarefa"}</h3>
                <p className="text-sm text-muted-foreground">{item.tarefas?.tipos_tarefa?.canais?.nome ?? "Canal"} · {item.tarefas?.categorias?.nome ?? "Categoria"}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">{statusLabel[item.status] ?? item.status}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Valor: <strong className="text-foreground">{moeda(item.tarefas?.tipos_tarefa?.valor_validador ?? 0)}</strong></span>
              <span className="text-muted-foreground">Perfil: <strong className="text-foreground">{item.handle}</strong></span>
            </div>
            {ativa && <p className="rounded-md bg-muted p-3 text-sm">Tempo restante: <strong className="tabular-nums">{expirouNoRelogio ? "Atualizando expiração..." : restante(item.expira_em)}</strong></p>}
            {item.tarefas?.is_demo && <p className="text-xs text-muted-foreground">Tarefa demonstrativa. A execução será liberada em uma fase posterior.</p>}
            <div className="flex flex-wrap gap-2">
              {item.tarefas?.is_demo ? (
                <Button type="button" variant="outline" disabled>Executar — Em breve</Button>
              ) : item.status === "habilitado" || item.status === "em_andamento" ? (
                <Link to="/validador/executar/$habilitacaoId" params={{ habilitacaoId: item.id }}>
                  <Button type="button">Avaliar publicação</Button>
                </Link>
              ) : null}
              {ativa && <Button type="button" variant="destructive" disabled={processando !== null || expirouNoRelogio} onClick={() => void desistir(item.id)}>{processando === item.id ? "Registrando..." : "Desistir"}</Button>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
