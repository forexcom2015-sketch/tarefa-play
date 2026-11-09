import { useCallback, useEffect, useState } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Tarefa = {
  id: string;
  categoria_id: string;
  vagas: number;
  vagas_ocupadas: number;
  vagas_concluidas: number;
  link_destino: string | null;
  tempo_estimado_minutos: number;
  is_demo: boolean;
  categorias?: { nome: string } | null;
  tipos_tarefa?: {
    nome: string;
    valor_validador: number | string;
    canais?: { nome: string } | null;
  } | null;
};

const db = supabase as any;
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));

export const Route = createFileRoute("/validador/")({
  component: TarefasDisponiveis,
});

function TarefasDisponiveis() {
  const navigate = useNavigate();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [habilitando, setHabilitando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { error: expiracaoError } = await db.rpc("processar_habilitacoes_expiradas");
    if (expiracaoError) {
      setErro("Não foi possível atualizar os prazos das tarefas. Confirme se a migration da Fase 5 está aplicada.");
      setCarregando(false);
      return;
    }
    const { data, error: tarefasError } = await db
      .from("tarefas")
      .select("id,categoria_id,vagas,vagas_ocupadas,vagas_concluidas,link_destino,tempo_estimado_minutos,is_demo,categorias(nome),tipos_tarefa(nome,valor_validador,canais(nome))")
      .eq("status", "ativa")
      .order("criado_em", { ascending: false });
    if (tarefasError) {
      setErro("O feed de tarefas ainda não está disponível. Verifique as migrations das Fases 3 e 5.");
      setTarefas([]);
    } else {
      setTarefas((data ?? []) as Tarefa[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
    const intervalo = window.setInterval(() => void carregar(), 30000);
    return () => window.clearInterval(intervalo);
  }, [carregar]);

  async function habilitar(tarefaId: string) {
    setHabilitando(tarefaId);
    setErro("");
    setMensagem("");
    const { error: habilitacaoError } = await db.rpc("habilitar_tarefa", { p_tarefa_id: tarefaId });
    setHabilitando(null);
    if (habilitacaoError) {
      setErro(habilitacaoError.message || "Não foi possível reservar esta vaga.");
      await carregar();
      return;
    }
    setMensagem("Vaga reservada. Confira o prazo em Minhas tarefas.");
    await carregar();
    navigate({ to: "/validador/minhas-tarefas" });
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tarefas disponíveis</h2>
        <p className="mt-1 text-sm text-muted-foreground">O feed mostra somente categorias dos seus interesses. A vaga fica reservada pelo prazo configurado pela administração.</p>
      </div>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando tarefas...</p> : tarefas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <h3 className="font-semibold text-foreground">Nenhuma tarefa disponível agora</h3>
          <p className="mt-1 text-sm text-muted-foreground">Novas tarefas aparecerão quando houver publicações nas categorias que você selecionou.</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void carregar()}>Atualizar feed</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tarefas.map((tarefa) => {
            const vagasLivres = Math.max(0, tarefa.vagas - tarefa.vagas_ocupadas - tarefa.vagas_concluidas);
            return (
              <article key={tarefa.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{tarefa.tipos_tarefa?.nome ?? "Tarefa"}</h3>
                      {tarefa.is_demo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Exemplo</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{tarefa.tipos_tarefa?.canais?.nome ?? "Canal"} · {tarefa.categorias?.nome ?? "Categoria"}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-primary">{moeda(tarefa.tipos_tarefa?.valor_validador ?? 0)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted p-2"><span className="block font-semibold text-foreground">{tarefa.tempo_estimado_minutos} min</span>Tempo estimado</div>
                  <div className="rounded-md bg-muted p-2"><span className="block font-semibold text-foreground">{vagasLivres}</span>Vagas livres</div>
                  <div className="rounded-md bg-muted p-2"><span className="block font-semibold text-foreground">{tarefa.vagas}</span>Vagas totais</div>
                </div>
                <Button className="w-full" onClick={() => void habilitar(tarefa.id)} disabled={habilitando !== null || vagasLivres <= 0}>
                  {habilitando === tarefa.id ? "Reservando vaga..." : tarefa.is_demo ? "Quero fazer esta tarefa de exemplo" : "Quero fazer esta tarefa"}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
