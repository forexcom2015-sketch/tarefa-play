import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { assinarCriativo } from "@/lib/criativos";
import { linkValido, redes, type Rede } from "@/lib/redes";

type Pub = { id: string; legenda: string; imagem_url: string };
type Tipo = { id: string; nome: string; valor_validador: number | string };
const db = supabase as any;
const cor: Record<Rede, string> = { instagram: "bg-instagram", facebook: "bg-facebook", youtube: "bg-youtube" };

export function CriarTarefaRede({ rede }: { rede: Rede }) {
  const info = redes[rede];
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [pubId, setPubId] = useState("");
  const [link, setLink] = useState("");
  const [vagas, setVagas] = useState("10");
  const [img, setImg] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, t] = await Promise.all([
        db.from("publicacoes").select("id,legenda,imagem_url").eq("status", "aprovada").eq("revisao_admin_pendente", false),
        db.from("tipos_tarefa").select("id,nome,valor_validador,canais!inner(slug)").eq("ativo", true).eq("metodo_verificacao", "token_lista").eq("canais.slug", rede).limit(1),
      ]);
      if (p.error || t.error) setErro("Não foi possível carregar os dados.");
      setPubs(p.data ?? []); setTipo(t.data?.[0] ?? null);
    })();
  }, [rede]);

  const pub = pubs.find((x) => x.id === pubId);
  useEffect(() => { setImg(null); if (pub) void assinarCriativo(pub.imagem_url).then(setImg); }, [pub]);

  async function salvar() {
    setErro(""); setOk("");
    if (!pub || !tipo) return setErro("Selecione uma publicação aprovada.");
    if (!linkValido(rede, link)) return setErro(`Informe um link válido do ${info.nome}.`);
    const n = Number(vagas);
    if (!Number.isInteger(n) || n < 1 || n > 10000) return setErro("Vagas entre 1 e 10000.");
    setSalvando(true);
    const { error } = await db.rpc("criar_tarefa_real", { p_publicacao_id: pub.id, p_tipo_tarefa_id: tipo.id, p_link_publicacao: link.trim(), p_vagas: n });
    setSalvando(false);
    if (error) return setErro(error.message || "Não foi possível criar a tarefa.");
    setOk("Tarefa criada e valor reservado na carteira."); setLink(""); setPubId("");
  }

  const midia = img ? <img src={img} alt="" className={rede === "youtube" ? "aspect-video w-full object-cover" : "aspect-square w-full object-cover"} /> : <div className={`${rede === "youtube" ? "aspect-video" : "aspect-square"} w-full bg-muted`} />;

  return (
    <section className="space-y-5">
      <header><h2 className="text-2xl font-bold text-foreground">Tarefa no {info.nome}</h2><p className="text-sm text-muted-foreground">Validadores farão um {info.acao}. <Link to="/anunciante/tarefas" className="text-primary underline">Ver minhas tarefas</Link></p></header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {ok && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">{ok}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <label className="block space-y-1 text-sm">Publicação aprovada
            <select value={pubId} onChange={(e) => setPubId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Selecione</option>{pubs.map((p) => <option key={p.id} value={p.id}>{p.legenda.slice(0, 80)}</option>)}</select>
          </label>
          <label className="block space-y-1 text-sm">Link da publicação no {info.nome}
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={info.exemplo} className="h-10 w-full rounded-md border border-input bg-background px-3" />
          </label>
          <label className="block space-y-1 text-sm">Vagas
            <input type="number" min="1" max="10000" value={vagas} onChange={(e) => setVagas(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
          </label>
          <Button disabled={salvando || !tipo} onClick={() => void salvar()}>{salvando ? "Salvando..." : "Criar tarefa e reservar valor"}</Button>
          {!tipo && <p className="text-xs text-muted-foreground">Tipo de tarefa indisponível.</p>}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card text-sm">
          <div className="flex items-center gap-2 p-3"><span className={`h-8 w-8 rounded-full ${cor[rede]}`} /><strong>sua_loja</strong><span className="ml-auto text-xs text-muted-foreground">{info.nome}</span></div>
          {rede === "facebook" && <p className="px-3 pb-2">{pub?.legenda ?? "Texto da publicação"}</p>}
          {midia}
          {rede === "instagram" && <div className="space-y-1 p-3"><p>♡ 💬 ➤</p><p><strong>sua_loja</strong> {pub?.legenda ?? "Legenda da publicação"}</p></div>}
          {rede === "facebook" && <div className="flex justify-around border-t border-border p-2 text-muted-foreground"><span>Curtir</span><span>Comentar</span><span>Compartilhar</span></div>}
          {rede === "youtube" && <div className="space-y-1 p-3"><p className="font-semibold">{pub?.legenda.slice(0, 90) ?? "Título do vídeo"}</p><p className="text-xs text-muted-foreground">sua_loja · Comentários</p></div>}
        </div>
      </div>
    </section>
  );
}
