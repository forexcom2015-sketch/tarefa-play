import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type PublicacaoResumo = { id: string; status: string };
type RodadaResumo = { id: string; status: string; valor_reservado: number | string };
const db = supabase as any;
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));

export const Route = createFileRoute("/anunciante/")({ component: InicioAnunciante });

function InicioAnunciante() {
  const [saldo, setSaldo] = useState(0);
  const [reservado, setReservado] = useState(0);
  const [publicacoes, setPublicacoes] = useState<PublicacaoResumo[]>([]);
  const [rodadas, setRodadas] = useState<RodadaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setErro("Entre novamente para consultar o painel."); setCarregando(false); return; }
    const [saldoResult, reservadoResult, publicacoesResult, rodadasResult] = await Promise.all([
      db.from("saldo_disponivel").select("saldo").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("saldo_reservado").select("saldo").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("publicacoes").select("id,status").order("atualizado_em", { ascending: false }),
      db.from("rodadas_validacao").select("id,status,valor_reservado").eq("status", "em_andamento").order("criado_em", { ascending: false }),
    ]);
    const falha = saldoResult.error ?? reservadoResult.error ?? publicacoesResult.error ?? rodadasResult.error;
    if (falha) setErro("Não foi possível carregar o painel. Confirme se as migrations das Fases 4 e 6 foram aplicadas no Supabase.");
    else {
      setSaldo(Number(saldoResult.data?.saldo ?? 0));
      setReservado(Number(reservadoResult.data?.saldo ?? 0));
      setPublicacoes((publicacoesResult.data ?? []) as PublicacaoResumo[]);
      setRodadas((rodadasResult.data ?? []) as RodadaResumo[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  const quantidade = (status: string) => publicacoes.filter((item) => item.status === status).length;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-foreground">Visão geral</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe sua carteira, publicações e rodadas de validação.</p></div>
        <button type="button" onClick={() => void carregar()} disabled={carregando} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">{carregando ? "Atualizando..." : "Atualizar"}</button>
      </header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando painel...</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Saldo disponível</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{moeda(saldo)}</p></article>
            <article className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Saldo reservado</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{moeda(reservado)}</p></article>
            <article className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Publicações</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{publicacoes.length}</p></article>
            <article className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Rodadas em andamento</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{rodadas.length}</p></article>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">Publicações por status</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Rascunhos</dt><dd className="text-xl font-semibold text-foreground">{quantidade("rascunho")}</dd></div>
                <div><dt className="text-muted-foreground">Em validação</dt><dd className="text-xl font-semibold text-foreground">{quantidade("em_validacao")}</dd></div>
                <div><dt className="text-muted-foreground">Aprovadas</dt><dd className="text-xl font-semibold text-foreground">{quantidade("aprovada")}</dd></div>
                <div><dt className="text-muted-foreground">Publicadas</dt><dd className="text-xl font-semibold text-foreground">{quantidade("publicada")}</dd></div>
              </dl>
            </article>
            <article className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">Rodadas em andamento</h3>
              {rodadas.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma rodada em andamento.</p> : <ul className="mt-3 space-y-2">{rodadas.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0"><span className="text-muted-foreground">Rodada {r.id.slice(0, 8)}</span><strong className="text-foreground">{moeda(r.valor_reservado)}</strong></li>)}</ul>}
            </article>
          </div>
        </>
      )}
    </section>
  );
}
