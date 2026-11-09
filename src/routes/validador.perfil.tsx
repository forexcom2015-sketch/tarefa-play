import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Categoria = { id: string; nome: string };
const db = supabase as any;

export const Route = createFileRoute("/validador/perfil")({
  component: PerfilValidador,
});

function PerfilValidador() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [handle, setHandle] = useState("");
  const [statusInstagram, setStatusInstagram] = useState("pendente");
  const [nivel, setNivel] = useState("Indisponível");
  const [indicacoes, setIndicacoes] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setErro("Entre novamente para consultar seu perfil.");
      setCarregando(false);
      return;
    }
    const [cats, interesses, social, indicacoesResult, niveisResult, tarefasResult] = await Promise.all([
      db.from("categorias").select("id,nome").eq("ativa", true).order("nome"),
      db.from("interesses_validador").select("categoria_id").eq("usuario_id", auth.user.id),
      db.from("contas_sociais").select("handle,status").eq("usuario_id", auth.user.id).eq("canal", "instagram").maybeSingle(),
      db.from("indicacoes").select("id", { count: "exact", head: true }).eq("indicador_id", auth.user.id),
      db.from("niveis").select("nome,ordem,tarefas_validas_minimas").eq("ativo", true).order("ordem"),
      db.from("lancamentos").select("id", { count: "exact", head: true }).eq("tipo", "pagamento_tarefa").gt("valor", 0),
    ]);
    const baseError = cats.error ?? interesses.error ?? social.error;
    if (baseError) {
      setErro("Não foi possível carregar seu perfil e interesses. Confira se as migrations das Fases 3 e 5 estão disponíveis.");
      setCarregando(false);
      return;
    }
    setCategorias((cats.data ?? []) as Categoria[]);
    setSelecionadas((interesses.data ?? []).map((item: { categoria_id: string }) => item.categoria_id));
    setHandle(social.data?.handle ?? "Não cadastrado");
    setStatusInstagram(social.data?.status ?? "não cadastrado");

    if (!indicacoesResult.error && !niveisResult.error && !tarefasResult.error) {
      setIndicacoes(indicacoesResult.count ?? 0);
      const total = tarefasResult.count ?? 0;
      const niveis = (niveisResult.data ?? []) as { nome: string; tarefas_validas_minimas: number }[];
      const elegiveis = niveis.filter((item) => total >= item.tarefas_validas_minimas);
      setNivel(elegiveis.length ? elegiveis[elegiveis.length - 1].nome : "Bronze");
    } else {
      setIndicacoes(null);
      setNivel("Disponível após a Fase 4");
    }
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function alternar(id: string) {
    setSelecionadas((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);
  }

  async function salvarInteresses() {
    if (selecionadas.length < 3 || selecionadas.length > 8) {
      setErro("Selecione de 3 a 8 interesses.");
      return;
    }
    setSalvando(true);
    setErro("");
    setMensagem("");
    const { error: salvarError } = await db.rpc("atualizar_interesses_validador", { p_categoria_ids: selecionadas });
    setSalvando(false);
    if (salvarError) {
      setErro(salvarError.message || "Não foi possível atualizar seus interesses.");
    } else {
      setMensagem("Seus interesses foram atualizados.");
      await carregar();
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Meu perfil</h2>
        <p className="mt-1 text-sm text-muted-foreground">Consulte sua conta social, interesses, nível e indicações.</p>
      </div>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando perfil...</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Conta Instagram</p>
              <p className="mt-1 font-semibold text-foreground">{handle.startsWith("@") ? handle : handle === "Não cadastrado" ? handle : `@${handle}`}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{statusInstagram}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Nível atual</p>
              <p className="mt-1 text-xl font-bold text-primary">{nivel}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Indicações diretas</p>
              <p className="mt-1 text-xl font-bold text-foreground">{indicacoes === null ? "—" : indicacoes}</p>
              <p className="text-xs text-muted-foreground">Programa de um único nível</p>
            </article>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Meus interesses</h3>
                <p className="text-sm text-muted-foreground">Escolha de 3 a 8 categorias para direcionar seu feed.</p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">{selecionadas.length}/8</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {categorias.map((categoria) => (
                <label key={categoria.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm text-foreground">
                  <input type="checkbox" checked={selecionadas.includes(categoria.id)} onChange={() => alternar(categoria.id)} disabled={salvando || (!selecionadas.includes(categoria.id) && selecionadas.length >= 8)} />
                  {categoria.nome}
                </label>
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={() => void salvarInteresses()} disabled={salvando || selecionadas.length < 3 || selecionadas.length > 8}>
              {salvando ? "Salvando..." : "Salvar interesses"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
