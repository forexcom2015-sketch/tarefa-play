import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Tarefa = {
  habilitacao_id: string;
  tarefa_id: string;
  rodada_id: string;
  publicacao_id: string;
  imagem_url: string;
  legenda: string;
  preco: number | string;
  oferta: string;
  categoria_nome: string;
  expira_em: string;
};

export const Route = createFileRoute("/validador/executar/$habilitacaoId")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  head: () => ({
    meta: [
      { title: "Avaliação interna — Tarefa-Play" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExecutarValidacao,
});

function ExecutarValidacao() {
  const { habilitacaoId } = Route.useParams();
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [interacoes, setInteracoes] = useState({ curtir: false, deslike: false, comentar: false, compartilhar: false });
  const [iniciouEm, setIniciouEm] = useState<number | null>(null);
  const [compraria, setCompraria] = useState("");
  const [notaProduto, setNotaProduto] = useState("");
  const [notaPreco, setNotaPreco] = useState("");
  const [notaDivulgacao, setNotaDivulgacao] = useState("");
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro("");
      const { data, error } = await (supabase as any).rpc("obter_tarefa_validacao", { p_habilitacao_id: habilitacaoId });
      if (!ativo) return;
      if (error) {
        setErro(error.message || "Não foi possível carregar a avaliação.");
      } else {
        const item = Array.isArray(data) ? data[0] : data;
        if (!item) setErro("Esta convocação não está mais disponível.");
        else {
          setTarefa(item as Tarefa);
          setIniciouEm(Date.now());
        }
      }
      setCarregando(false);
    }
    void carregar();
    return () => { ativo = false; };
  }, [habilitacaoId]);

  function alternar(nome: keyof typeof interacoes) {
    setInteracoes((atual) => ({ ...atual, [nome]: !atual[nome] }));
  }

  const interagiu = Object.values(interacoes).some(Boolean);
  const tempoTela = iniciouEm ? Math.floor((Date.now() - iniciouEm) / 1000) : 0;

  async function enviar() {
    setErro("");
    setMensagem("");
    if (!interagiu) { setErro("Faça pelo menos uma interação com o conteúdo antes de responder."); return; }
    if (!compraria || !notaProduto || !notaPreco || !notaDivulgacao) { setErro("Responda à intenção de compra e dê as três notas."); return; }
    if (comentario.trim().length < 20) { setErro("Escreva um motivo com pelo menos 20 caracteres."); return; }
    if (tempoTela < 10) { setErro("Permaneça na avaliação por pelo menos 10 segundos antes de enviar."); return; }

    setEnviando(true);
    const { error } = await (supabase as any).rpc("concluir_avaliacao_interna", {
      p_habilitacao_id: habilitacaoId,
      p_compraria: compraria,
      p_nota_produto: Number(notaProduto),
      p_nota_preco: Number(notaPreco),
      p_nota_divulgacao: Number(notaDivulgacao),
      p_comentario: comentario.trim(),
      p_interacoes: interacoes,
      p_tempo_tela_segundos: tempoTela,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message || "Não foi possível registrar a avaliação.");
      return;
    }
    setMensagem("Avaliação registrada. O pagamento foi lançado independentemente da sua nota.");
  }

  if (carregando) return <section className="space-y-4"><p role="status" className="text-sm text-muted-foreground">Carregando avaliação...</p></section>;
  if (mensagem) return <section className="space-y-4"><article className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-bold text-foreground">Avaliação concluída</h2><p className="mt-2 text-sm text-muted-foreground">{mensagem}</p><Link to="/validador/minhas-tarefas" className="mt-4 inline-block text-sm font-medium text-primary">Voltar para minhas tarefas</Link></article></section>;
  if (!tarefa) return <section className="space-y-4"><p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro || "Avaliação indisponível."}</p><Link to="/validador/minhas-tarefas" className="text-sm font-medium text-primary">Voltar</Link></section>;

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <header>
        <h2 className="text-xl font-bold text-foreground">Avaliação interna</h2>
        <p className="mt-1 text-sm text-muted-foreground">Avalie como uma pessoa comum. Nenhuma nota de outro Validador é exibida.</p>
      </header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}

      <article className="overflow-hidden rounded-xl border border-border bg-card">
        <img src={tarefa.imagem_url} alt="Criativo da publicação" className="max-h-80 w-full object-cover" />
        <div className="space-y-4 p-4 sm:p-6">
          <p className="whitespace-pre-wrap text-sm text-foreground">{tarefa.legenda}</p>
          <div className="grid gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Preço</span><p className="font-semibold text-foreground">R$ {Number(tarefa.preco).toFixed(2).replace(".", ",")}</p></div>
            <div><span className="text-muted-foreground">Oferta</span><p className="font-semibold text-foreground">{tarefa.oferta}</p></div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Interaja com o conteúdo</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ["curtir", "Curtir"],
                ["deslike", "Deslike"],
                ["comentar", "Comentar"],
                ["compartilhar", "Compartilhar"],
              ] as const).map(([key, label]) => (
                <Button key={key} type="button" variant={interacoes[key] ? "default" : "outline"} onClick={() => alternar(key)}>{label}</Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-foreground">Questionário</h3>
            <fieldset>
              <legend className="text-sm font-medium text-foreground">Você compraria?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {["sim", "talvez", "nao"].map((opcao) => <Button key={opcao} type="button" variant={compraria === opcao ? "default" : "outline"} onClick={() => setCompraria(opcao)}>{opcao === "nao" ? "Não" : opcao[0].toUpperCase() + opcao.slice(1)}</Button>)}
              </div>
            </fieldset>

            {([
              ["notaProduto", "Produto"],
              ["notaPreco", "Preço"],
              ["notaDivulgacao", "Divulgação"],
            ] as const).map(([campo, label]) => (
              <fieldset key={campo}>
                <legend className="text-sm font-medium text-foreground">{label} · nota de 1 a 5</legend>
                <div className="mt-2 flex gap-2">{[1,2,3,4,5].map((n) => <Button key={n} type="button" size="sm" variant={Number({ notaProduto, notaPreco, notaDivulgacao }[campo]) === n ? "default" : "outline"} onClick={() => campo === "notaProduto" ? setNotaProduto(String(n)) : campo === "notaPreco" ? setNotaPreco(String(n)) : setNotaDivulgacao(String(n))}>{n}</Button>)}</div>
              </fieldset>
            ))}

            <label className="block space-y-1 text-sm font-medium text-foreground">
              Motivo da sua avaliação
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={5} minLength={20} maxLength={2000} placeholder="Explique o que influenciou sua decisão..." className="w-full rounded-md border border-input bg-background p-3 font-normal" />
            </label>
            <p className="text-xs text-muted-foreground">Tempo mínimo de tela: 10 segundos. Sua nota não altera o pagamento.</p>
          </div>

          <Button className="w-full" disabled={enviando} onClick={() => void enviar()}>{enviando ? "Enviando..." : "Enviar avaliação"}</Button>
        </div>
      </article>
    </section>
  );
}
