import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { exigirPapel } from "@/lib/papel";
import { Button } from "@/components/ui/button";

type Pix = { usuario_id: string; titular_nome: string; titular_cpf: string; tipo_chave: string; chave: string; aprovado: boolean };
type Social = { id: string; usuario_id: string; handle: string; data_primeira_postagem: string; imagem_url: string | null; status: "pendente" | "aprovada" | "rejeitada"; signedUrl?: string | null };

export const Route = createFileRoute("/admin/cadastros")({
  ssr: false,
  beforeLoad: () => exigirPapel("admin"),
  head: () => ({ meta: [{ title: "Revisão de cadastros — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: RevisaoCadastros,
});

function RevisaoCadastros() {
  const [pix, setPix] = useState<Pix[]>([]);
  const [sociais, setSociais] = useState<Social[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");

  const db = supabase as any;
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const [pixResult, socialResult] = await Promise.all([
      db.from("contas_pix").select("usuario_id,titular_nome,titular_cpf,tipo_chave,chave,aprovado").order("atualizado_em", { ascending: false }),
      db.from("contas_sociais").select("id,usuario_id,handle,data_primeira_postagem,imagem_url,status").order("criado_em", { ascending: false }),
    ]);
    if (pixResult.error || socialResult.error) {
      setErro(pixResult.error?.message ?? socialResult.error?.message ?? "Não foi possível carregar as revisões.");
      setCarregando(false);
      return;
    }
    setPix((pixResult.data ?? []) as Pix[]);
    const itens = (socialResult.data ?? []) as Social[];
    const comImagens = await Promise.all(itens.map(async (item) => {
      if (!item.imagem_url) return { ...item, signedUrl: null };
      const { data } = await supabase.storage.from("verificacoes-instagram").createSignedUrl(item.imagem_url, 3600);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    }));
    setSociais(comImagens);
    setCarregando(false);
  }, [db]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function revisarPix(usuarioId: string, aprovado: boolean) {
    setSalvando(usuarioId);
    const { error } = await db.from("contas_pix").update({ aprovado }).eq("usuario_id", usuarioId);
    setSalvando("");
    if (error) setErro(error.message);
    else await carregar();
  }

  async function revisarSocial(id: string, status: "aprovada" | "rejeitada") {
    setSalvando(id);
    const { error } = await db.from("contas_sociais").update({ status }).eq("id", id);
    setSalvando("");
    if (error) setErro(error.message);
    else await carregar();
  }

  return (
    <main className="min-h-screen bg-secondary px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-foreground">Revisão de cadastros</h1><p className="text-sm text-muted-foreground">Aprovação manual de contas Pix e evidências do Instagram.</p></div>
          <Button variant="outline" onClick={() => void carregar()}>Atualizar</Button>
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {carregando ? <p className="text-sm text-muted-foreground">Carregando revisões...</p> : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Contas Pix</h2>
              {pix.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta Pix cadastrada.</p>}
              {pix.map((item) => (
                <article key={item.usuario_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="min-w-0"><p className="font-medium text-foreground">{item.titular_nome}</p><p className="text-sm text-muted-foreground">CPF: {item.titular_cpf} · {item.tipo_chave}: {item.chave}</p><p className="text-xs text-muted-foreground">Usuário: {item.usuario_id}</p><p className="text-xs text-muted-foreground">Status: {item.aprovado ? "Aprovada" : "Pendente"}</p></div>
                  <div className="flex gap-2"><Button size="sm" disabled={salvando === item.usuario_id || item.aprovado} onClick={() => void revisarPix(item.usuario_id, true)}>Aprovar</Button><Button size="sm" variant="outline" disabled={salvando === item.usuario_id || !item.aprovado} onClick={() => void revisarPix(item.usuario_id, false)}>Retirar aprovação</Button></div>
                </article>
              ))}
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Instagram</h2>
              {sociais.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta social cadastrada.</p>}
              {sociais.map((item) => (
                <article key={item.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-foreground">@{item.handle}</p><p className="text-sm text-muted-foreground">Primeira postagem: {item.data_primeira_postagem} · Status: {item.status}</p><p className="text-xs text-muted-foreground">Usuário: {item.usuario_id}</p></div><div className="flex gap-2"><Button size="sm" disabled={salvando === item.id || item.status === "aprovada"} onClick={() => void revisarSocial(item.id, "aprovada")}>Aprovar</Button><Button size="sm" variant="outline" disabled={salvando === item.id || item.status === "rejeitada"} onClick={() => void revisarSocial(item.id, "rejeitada")}>Rejeitar</Button></div></div>
                  {item.signedUrl ? <img src={item.signedUrl} alt={`Evidência da primeira postagem de @${item.handle}`} className="max-h-80 rounded-lg border border-border object-contain" /> : <p className="text-xs text-muted-foreground">Imagem privada indisponível ou não enviada.</p>}
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
