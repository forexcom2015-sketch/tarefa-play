import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { exigirPapel } from "@/lib/papel";

type Habilitacao = {
  id: string; status: string; expira_em: string;
  tarefas?: {
    link_destino: string;
    tipos_tarefa?: { nome: string; canais?: { nome: string } | null } | null;
  } | null;
};
type ResultadoToken = { success: boolean; message: string; valor_pago?: number };

const db = supabase as any;

export const Route = createFileRoute("/validador/token/$habilitacaoId")({
  ssr: false,
  beforeLoad: async () => {
    await exigirPapel("validador");
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  head: () => ({ meta: [{ title: "Validar código — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: ValidarCodigo,
});

function ValidarCodigo() {
  const { habilitacaoId } = Route.useParams();
  const [habilitacao, setHabilitacao] = useState<Habilitacao | null>(null);
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [linkComentario, setLinkComentario] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [concluida, setConcluida] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro("");
      await db.rpc("processar_chamados_token_expirados");
      const { data, error } = await db.from("habilitacoes")
        .select("id,status,expira_em,tarefas(link_destino,tipos_tarefa(nome,canais(nome)))")
        .eq("id", habilitacaoId).maybeSingle();
      if (!ativo) return;
      if (error || !data) setErro(error?.message || "Habilitação não encontrada.");
      else setHabilitacao(data as Habilitacao);
      setCarregando(false);
    }
    void carregar();
    return () => { ativo = false; };
  }, [habilitacaoId]);

  async function validar() {
    setErro(""); setMensagem("");
    if (codigo.trim().length < 16) { setErro("Cole o código recebido por mensagem privada."); return; }
    setProcessando(true);
    const { data, error } = await db.rpc("validar_token_tarefa", {
      p_habilitacao_id: habilitacaoId,
      p_codigo: codigo.trim(),
    });
    setProcessando(false);
    if (error) { setErro(error.message || "Não foi possível validar o código."); return; }
    const resultado = data as ResultadoToken;
    if (!resultado?.success) { setErro(resultado?.message || "Código não validado."); return; }
    setConcluida(true);
    setMensagem(resultado.message || "Código validado e pagamento registrado.");
  }

  async function abrirChamado() {
    setErro(""); setMensagem("");
    if (motivo.trim().length < 10) { setErro("Explique o problema com pelo menos 10 caracteres."); return; }
    try {
      const url = new URL(linkComentario);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch { setErro("Informe o link público do seu comentário no Instagram."); return; }
    setProcessando(true);
    const { error } = await db.rpc("abrir_chamado_token", {
      p_habilitacao_id: habilitacaoId,
      p_motivo: motivo.trim(),
      p_link_comentario: linkComentario.trim(),
      p_evidencia: evidencia.trim() || null,
    });
    setProcessando(false);
    if (error) setErro(error.message || "Não foi possível abrir o chamado.");
    else setMensagem("Chamado registrado. O Anunciante terá 24 horas para resolver; depois disso, o caso será encaminhado ao suporte, com prazo de até 48 horas.");
  }

  if (carregando) return <section><p role="status" className="text-sm text-muted-foreground">Carregando tarefa...</p></section>;
  if (concluida) return <section className="mx-auto max-w-xl space-y-4"><article className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-bold text-foreground">Tarefa validada</h2><p className="mt-2 text-sm text-muted-foreground">{mensagem}</p><Link to="/validador/minhas-tarefas" className="mt-4 inline-block text-sm font-semibold text-primary">Voltar para minhas tarefas</Link></article></section>;
  if (!habilitacao) return <section className="space-y-3"><p role="alert" className="text-sm text-destructive">{erro || "Tarefa indisponível."}</p><Link to="/validador/minhas-tarefas" className="text-sm text-primary underline">Voltar</Link></section>;

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <header><h2 className="text-xl font-bold text-foreground">Validar comentário no Instagram</h2><p className="mt-1 text-sm text-muted-foreground">Comente na publicação real, aguarde a mensagem com seu código individual e cole-o abaixo.</p></header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">{mensagem}</p>}
      <article className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="font-semibold text-foreground">{habilitacao.tarefas?.tipos_tarefa?.nome ?? "Comentário no Instagram"}</p>
        <a href={habilitacao.tarefas?.link_destino ?? "#"} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline">Abrir publicação e comentar</a>
        <p className="text-xs text-muted-foreground">O código expira em até 30 minutos, é de uso único e permite no máximo cinco tentativas. Não use o código de outra conta.</p>
        <label className="block space-y-1 text-sm font-medium">Código recebido
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ""))} maxLength={128} autoComplete="one-time-code" placeholder="Cole seu código individual" className="h-11 w-full rounded-md border border-input bg-background px-3 font-mono uppercase" />
        </label>
        <Button className="w-full" disabled={processando || ["validada","expirada","desistiu","rejeitada"].includes(habilitacao.status)} onClick={() => void validar()}>{processando ? "Validando..." : "Validar código e concluir tarefa"}</Button>
      </article>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground">Não recebi o código</h3>
        <p className="text-sm text-muted-foreground">Abra um chamado com o link do comentário. O Anunciante terá 24 horas para resolver; sem solução, o caso sobe ao suporte por até 48 horas.</p>
        <label className="block space-y-1 text-sm">Motivo
          <textarea rows={3} minLength={10} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explique quando comentou e o que aconteceu..." className="w-full rounded-md border border-input bg-background p-3" />
        </label>
        <label className="block space-y-1 text-sm">Link público do comentário
          <input type="url" value={linkComentario} onChange={(e) => setLinkComentario(e.target.value)} placeholder="https://www.instagram.com/p/..." className="h-10 w-full rounded-md border border-input bg-background px-3" />
        </label>
        <label className="block space-y-1 text-sm">Evidência (link opcional)
          <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="Link de imagem ou evidência" className="h-10 w-full rounded-md border border-input bg-background px-3" />
        </label>
        <Button variant="outline" className="w-full" disabled={processando} onClick={() => void abrirChamado()}>{processando ? "Enviando..." : "Abrir chamado"}</Button>
      </article>
      <Link to="/validador/minhas-tarefas" className="text-sm font-medium text-primary underline">Voltar para minhas tarefas</Link>
    </section>
  );
}
