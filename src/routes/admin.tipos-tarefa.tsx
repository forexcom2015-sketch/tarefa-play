import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type TipoTarefa = {
  id: string;
  canal_id: string;
  acao: string;
  nome: string;
  valor_validador: number | string;
  metodo_verificacao: string;
  ativo: boolean;
  canais?: { nome: string } | null;
};
const db = supabase as any;
const metodos = [
  { value: "avaliacao_interna", label: "Avaliação interna" },
  { value: "token_lista", label: "Token em lista" },
  { value: "codigo_no_conteudo", label: "Código no conteúdo" },
  { value: "link_rastreado", label: "Link rastreado" },
];

export const Route = createFileRoute("/admin/tipos-tarefa")({
  component: TiposTarefaAdmin,
});

function TiposTarefaAdmin() {
  const [tipos, setTipos] = useState<TipoTarefa[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [metodosPorId, setMetodosPorId] = useState<Record<string, string>>({});
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [ativos, setAtivos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data, error } = await db.from("tipos_tarefa").select("id,canal_id,acao,nome,valor_validador,metodo_verificacao,ativo,canais(nome)").order("canal_id");
    if (error) {
      setErro("Os tipos de tarefa ainda não estão disponíveis. A migration da Fase 5 precisa ser aplicada antes de editar estes valores.");
      setTipos([]);
    } else {
      const itens = (data ?? []) as TipoTarefa[];
      setTipos(itens);
      setValores(Object.fromEntries(itens.map((item) => [item.id, String(item.valor_validador)])));
      setMetodosPorId(Object.fromEntries(itens.map((item) => [item.id, item.metodo_verificacao])));
      setNomes(Object.fromEntries(itens.map((item) => [item.id, item.nome])));
      setAtivos(Object.fromEntries(itens.map((item) => [item.id, item.ativo])));
    }
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar(item: TipoTarefa) {
    const valor = Number(valores[item.id]);
    if (!Number.isFinite(valor) || valor <= 0 || valor > 1000 || !nomes[item.id]?.trim()) {
      setErro("Informe nome e valor maior que zero e até R$ 1.000,00.");
      return;
    }
    setSalvando(item.id);
    setErro("");
    setMensagem("");
    const { error } = await db.from("tipos_tarefa").update({
      nome: nomes[item.id].trim(),
      valor_validador: Math.round(valor * 100) / 100,
      metodo_verificacao: metodosPorId[item.id],
      ativo: ativos[item.id],
      atualizado_em: new Date().toISOString(),
    }).eq("id", item.id);
    setSalvando(null);
    if (error) setErro(error.message || "Não foi possível salvar o tipo de tarefa.");
    else {
      setMensagem(`Configuração de ${item.nome} salva.`);
      await carregar();
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tipos de tarefa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure os valores pagos ao Validador e o método de verificação de cada canal. Alterações não liberam execução nesta fase.</p>
      </div>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando tipos...</p> : tipos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhum tipo de tarefa configurado.</p>
      ) : tipos.map((item) => (
        <article key={item.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <h2 className="font-semibold text-foreground">{item.canais?.nome ?? "Canal"} · {item.acao}</h2>
          </div>
          <label className="block space-y-1 text-sm text-muted-foreground">Nome
            <input value={nomes[item.id] ?? ""} onChange={(event) => setNomes((atual) => ({ ...atual, [item.id]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-muted-foreground">Valor do Validador (R$)
              <input type="number" min="0.01" max="1000" step="0.01" value={valores[item.id] ?? ""} onChange={(event) => setValores((atual) => ({ ...atual, [item.id]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" />
            </label>
            <label className="space-y-1 text-sm text-muted-foreground">Método de verificação
              <select value={metodosPorId[item.id] ?? "avaliacao_interna"} onChange={(event) => setMetodosPorId((atual) => ({ ...atual, [item.id]: event.target.value }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-foreground">
                {metodos.map((metodo) => <option key={metodo.value} value={metodo.value}>{metodo.label}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={ativos[item.id] ?? item.ativo} onChange={(event) => setAtivos((atual) => ({ ...atual, [item.id]: event.target.checked }))} />
            Tipo ativo no catálogo
          </label>
          <Button onClick={() => void salvar(item)} disabled={salvando !== null}>{salvando === item.id ? "Salvando..." : "Salvar configuração"}</Button>
        </article>
      ))}
    </section>
  );
}
