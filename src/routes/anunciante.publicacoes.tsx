import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Categoria = { id: string; nome: string };
type Restricao = { id: string; nome: string; descricao: string; exige_revisao: boolean };
type Publicacao = {
  id: string; categoria_id: string; legenda: string; preco: number | string; oferta: string;
  versao: number; status: string; imagem_url: string | null; revisao_admin_pendente: boolean;
  categorias?: { nome: string } | null;
};
type Formulario = {
  categoriaId: string; idadeMin: string; idadeMax: string; regiao: string;
  legenda: string; link: string; preco: string; oferta: string;
  restricaoId: string; produtoEhCurso: boolean;
};
const db = supabase as any;
const estadoInicial: Formulario = {
  categoriaId: "", idadeMin: "18", idadeMax: "65", regiao: "",
  legenda: "", link: "", preco: "0", oferta: "", restricaoId: "", produtoEhCurso: false,
};
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));
const statusLabel: Record<string, string> = { rascunho: "Rascunho", em_validacao: "Em validação", aprovada: "Aprovada", publicada: "Publicada" };

export const Route = createFileRoute("/anunciante/publicacoes")({ component: PublicacoesAnunciante });

function PublicacoesAnunciante() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [restricoes, setRestricoes] = useState<Restricao[]>([]);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [form, setForm] = useState<Formulario>(estadoInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapa, setEtapa] = useState(1);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setErro("Entre novamente para consultar suas publicações."); setCarregando(false); return; }
    const [cats, restr, pubs] = await Promise.all([
      db.from("categorias").select("id,nome").eq("ativa", true).order("nome"),
      db.from("restricoes").select("id,nome,descricao,exige_revisao").eq("ativa", true).order("nome"),
      db.from("publicacoes").select("id,categoria_id,legenda,preco,oferta,versao,status,imagem_url,revisao_admin_pendente,categorias(nome)").order("atualizado_em", { ascending: false }),
    ]);
    const falha = cats.error ?? restr.error ?? pubs.error;
    if (falha) setErro("Não foi possível carregar publicações, categorias ou restrições. Confirme se a migration da Fase 6 foi aplicada.");
    else {
      setCategorias((cats.data ?? []) as Categoria[]);
      setRestricoes((restr.data ?? []) as Restricao[]);
      setPublicacoes((pubs.data ?? []) as Publicacao[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const atualizar = (campo: keyof Formulario, valor: string | boolean) => setForm((atual) => ({ ...atual, [campo]: valor }));

  function validarEtapa(atual: number) {
    setErro("");
    if (atual === 1) {
      const min = Number(form.idadeMin); const max = Number(form.idadeMax);
      if (!form.categoriaId || !form.regiao.trim() || !Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max < min || max > 120) {
        setErro("Selecione a categoria, informe a região e uma faixa etária válida (a partir de 18 anos)."); return false;
      }
    }
    if (atual === 2) {
      if (form.link.trim()) {
        try { const url = new URL(form.link); if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(); }
        catch { setErro("Informe um link válido começando com https:// ou http://."); return false; }
      }
      if (!form.legenda.trim()) { setErro("Informe a legenda da publicação."); return false; }
      if (arquivo && (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) {
        setErro("A imagem deve ser JPG, PNG ou WEBP e ter no máximo 5 MB."); return false;
      }
    }
    if (atual === 3) {
      if (!Number.isFinite(Number(form.preco)) || Number(form.preco) < 0 || !form.oferta.trim()) {
        setErro("Informe um preço válido e descreva a oferta."); return false;
      }
      const selecionada = restricoes.find((item) => item.id === form.restricaoId);
      if (selecionada && /cassino|multin[ií]vel|mmn/i.test(selecionada.nome)) {
        setErro("Esta categoria de produto é restrita e não pode ser publicada no Tarefa-Play."); return false;
      }
      if (selecionada && /criptomoedas/i.test(selecionada.nome) && !form.produtoEhCurso) {
        setErro("Produtos de criptomoedas só podem prosseguir quando forem cursos educacionais."); return false;
      }
    }
    return true;
  }

  async function salvarRascunho() {
    if (!validarEtapa(3)) { setEtapa(3); return; }
    setSalvando(true); setErro(""); setMensagem("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) { setErro("Sua sessão expirou. Entre novamente."); setSalvando(false); return; }
    const id = crypto.randomUUID();
    let imagemUrl: string | null = null;
    let caminhoArquivo: string | null = null;
    if (arquivo) {
      const nomeSeguro = arquivo.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
      caminhoArquivo = `${auth.user.id}/${id}/${Date.now()}-${nomeSeguro}`;
      const { error: uploadError } = await supabase.storage.from("criativos-publicacoes").upload(caminhoArquivo, arquivo, { contentType: arquivo.type, upsert: false });
      if (uploadError) { setErro(uploadError.message || "Não foi possível enviar a imagem."); setSalvando(false); return; }
      imagemUrl = supabase.storage.from("criativos-publicacoes").getPublicUrl(caminhoArquivo).data.publicUrl;
    }
    const selecionada = restricoes.find((item) => item.id === form.restricaoId);
    const revisaoPendente = Boolean(selecionada?.exige_revisao && form.produtoEhCurso);
    const { error: insertError } = await db.from("publicacoes").insert({
      id, anunciante_id: auth.user.id, categoria_id: form.categoriaId,
      publico_alvo: { idade_min: Number(form.idadeMin), idade_max: Number(form.idadeMax), regiao: form.regiao.trim() },
      imagem_url: imagemUrl, legenda: form.legenda.trim(), link: form.link.trim() || null,
      preco: Number(form.preco), oferta: form.oferta.trim(), versao: 1, status: "rascunho",
      restricao_id: form.restricaoId || null, produto_eh_curso: form.produtoEhCurso,
      revisao_admin_pendente: revisaoPendente,
    });
    if (insertError) {
      if (caminhoArquivo) await supabase.storage.from("criativos-publicacoes").remove([caminhoArquivo]);
      setErro(insertError.message || "Não foi possível salvar o rascunho."); setSalvando(false); return;
    }
    setMensagem(revisaoPendente ? "Rascunho salvo. O curso de criptomoedas foi marcado para revisão do Admin e não pode contratar validações antes da aprovação." : "Rascunho salvo com sucesso.");
    setForm(estadoInicial); setArquivo(null); setEtapa(1); setCriando(false); setSalvando(false);
    await carregar();
  }

  async function duplicar(id: string) {
    setSalvando(true); setErro(""); setMensagem("");
    const { data, error } = await db.rpc("duplicar_publicacao", { p_publicacao_id: id });
    setSalvando(false);
    if (error) setErro(error.message || "Não foi possível duplicar a publicação.");
    else { setMensagem("Nova versão criada como rascunho."); await carregar(); }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-foreground">Publicações</h2><p className="mt-1 text-sm text-muted-foreground">Crie e organize as ofertas que serão submetidas à validação.</p></div>
        <Button onClick={() => { setCriando((v) => !v); setErro(""); setMensagem(""); }}>{criando ? "Fechar formulário" : "Nova publicação"}</Button>
      </header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}

      {criando && (
        <article className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-foreground">Nova publicação · Etapa {etapa} de 4</h3><span className="text-xs text-muted-foreground">Rascunho até a contratação</span></div>
          <div className="grid grid-cols-4 gap-1" aria-label="Progresso do formulário">{[1,2,3,4].map((n) => <div key={n} className={`h-1.5 rounded-full ${n <= etapa ? "bg-primary" : "bg-muted"}`} />)}</div>

          {etapa === 1 && <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-foreground">Categoria
              <select value={form.categoriaId} onChange={(e) => atualizar("categoriaId", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Selecione</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            </label>
            <label className="space-y-1 text-sm text-foreground">Região / localização
              <input value={form.regiao} onChange={(e) => atualizar("regiao", e.target.value)} placeholder="Ex.: Brasil, Nordeste ou São Paulo" className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label className="space-y-1 text-sm text-foreground">Idade mínima
              <input type="number" min="18" max="120" value={form.idadeMin} onChange={(e) => atualizar("idadeMin", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label className="space-y-1 text-sm text-foreground">Idade máxima
              <input type="number" min="18" max="120" value={form.idadeMax} onChange={(e) => atualizar("idadeMax", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
          </div>}

          {etapa === 2 && <div className="space-y-3">
            <label className="block space-y-1 text-sm text-foreground">Imagem do criativo (JPG, PNG ou WEBP · até 5 MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="block w-full rounded-md border border-input bg-background p-2 text-sm" />
            </label>
            {arquivo && <p className="text-xs text-muted-foreground">Arquivo selecionado: {arquivo.name}</p>}
            <label className="block space-y-1 text-sm text-foreground">Legenda
              <textarea rows={4} maxLength={2000} value={form.legenda} onChange={(e) => atualizar("legenda", e.target.value)} className="w-full rounded-md border border-input bg-background p-3" placeholder="Descreva o produto ou serviço..." />
            </label>
            <label className="block space-y-1 text-sm text-foreground">Link de destino (opcional)
              <input type="url" value={form.link} onChange={(e) => atualizar("link", e.target.value)} placeholder="https://..." className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
          </div>}

          {etapa === 3 && <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-foreground">Preço (R$)
                <input type="number" min="0" step="0.01" value={form.preco} onChange={(e) => atualizar("preco", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3" />
              </label>
              <label className="space-y-1 text-sm text-foreground">Oferta
                <input value={form.oferta} onChange={(e) => atualizar("oferta", e.target.value)} placeholder="Ex.: frete grátis, desconto..." className="h-10 w-full rounded-md border border-input bg-background px-3" />
              </label>
            </div>
            <label className="block space-y-1 text-sm text-foreground">Seu produto se enquadra em alguma destas restrições?
              <select value={form.restricaoId} onChange={(e) => { atualizar("restricaoId", e.target.value); atualizar("produtoEhCurso", false); }} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="">Não se enquadra</option>{restricoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
            </label>
            {form.restricaoId && /criptomoedas/i.test(restricoes.find((r) => r.id === form.restricaoId)?.nome ?? "") && <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.produtoEhCurso} onChange={(e) => atualizar("produtoEhCurso", e.target.checked)} /> Meu produto é exclusivamente um curso educacional sobre criptomoedas.</label>}
            {form.restricaoId && <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{restricoes.find((r) => r.id === form.restricaoId)?.descricao}</p>}
          </div>}

          {etapa === 4 && <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-foreground">Revise antes de salvar</h4>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Categoria</dt><dd className="font-medium text-foreground">{categorias.find((c) => c.id === form.categoriaId)?.nome}</dd></div>
              <div><dt className="text-muted-foreground">Público-alvo</dt><dd className="font-medium text-foreground">{form.idadeMin}–{form.idadeMax} anos · {form.regiao}</dd></div>
              <div><dt className="text-muted-foreground">Preço</dt><dd className="font-medium text-foreground">{moeda(form.preco)}</dd></div>
              <div><dt className="text-muted-foreground">Oferta</dt><dd className="font-medium text-foreground">{form.oferta}</dd></div>
            </dl>
            <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-foreground">{form.legenda}</p>
            {arquivo && <p className="text-muted-foreground">Imagem: {arquivo.name}</p>}
            {form.restricaoId && <p className="text-muted-foreground">Restrição selecionada: {restricoes.find((r) => r.id === form.restricaoId)?.nome}. {form.produtoEhCurso ? "Será encaminhado para revisão do Admin." : ""}</p>}
          </div>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button variant="outline" disabled={etapa === 1 || salvando} onClick={() => setEtapa((v) => Math.max(1, v - 1))}>Voltar</Button>
            {etapa < 4 ? <Button disabled={salvando} onClick={() => { if (validarEtapa(etapa)) setEtapa((v) => v + 1); }}>Continuar</Button> : <Button disabled={salvando} onClick={() => void salvarRascunho()}>{salvando ? "Salvando..." : "Salvar como rascunho"}</Button>}
          </div>
        </article>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Suas publicações</h3>
        {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando publicações...</p> : publicacoes.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Você ainda não criou publicações.</p> : publicacoes.map((p) => (
          <article key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-foreground">{p.categorias?.nome ?? "Publicação"} · V{p.versao}</h4><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{statusLabel[p.status] ?? p.status}</span></div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.legenda}</p>
              <p className="mt-1 text-xs text-muted-foreground">{moeda(p.preco)}{p.revisao_admin_pendente ? " · Aguardando revisão do Admin" : ""}</p>
            </div>
            <Button variant="outline" size="sm" disabled={salvando} onClick={() => void duplicar(p.id)}>Duplicar como nova versão</Button>
          </article>
        ))}
      </div>
    </section>
  );
}
