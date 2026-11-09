import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Publicacao = { id: string; legenda: string; status: string; categoria_id: string; revisao_admin_pendente: boolean; categorias?: { nome: string } | null };
type Rodada = { id: string; publicacao_id: string; quantidade_contratada: number; quantidade_concluida: number; valor_reservado: number | string; status: string };
type Confirmacao = { publicacao: Publicacao; estimativa: number; valor: number };
const db = supabase as any;
const moeda = (valor: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));

export const Route = createFileRoute("/anunciante/validacoes")({ component: ValidacoesAnunciante });

function ValidacoesAnunciante() {
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    const [pubs, rounds] = await Promise.all([
      db.from("publicacoes").select("id,legenda,status,categoria_id,revisao_admin_pendente,categorias(nome)").order("atualizado_em", { ascending: false }),
      db.from("rodadas_validacao").select("id,publicacao_id,quantidade_contratada,quantidade_concluida,valor_reservado,status").order("criado_em", { ascending: false }),
    ]);
    if (pubs.error || rounds.error) setErro("Não foi possível carregar as validações. Confirme se a migration da Fase 6 foi aplicada.");
    else { setPublicacoes((pubs.data ?? []) as Publicacao[]); setRodadas((rounds.data ?? []) as Rodada[]); }
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function preparar(publicacao: Publicacao) {
    setErro(""); setMensagem(""); setProcessando(true);
    const [estimativa, pacote] = await Promise.all([
      db.rpc("estimar_validadores_disponiveis", { p_categoria_id: publicacao.categoria_id }),
      db.rpc("obter_pacote_validacao_minimo"),
    ]);
    setProcessando(false);
    if (estimativa.error || pacote.error) { setErro(estimativa.error?.message ?? pacote.error?.message ?? "Não foi possível estimar a rodada."); return; }
    if (Number(estimativa.data) < 1) { setErro("Não há Validadores aprovados disponíveis nesta categoria neste momento."); return; }
    setConfirmacao({ publicacao, estimativa: Number(estimativa.data), valor: Number(pacote.data) });
  }

  async function confirmar() {
    if (!confirmacao) return;
    setProcessando(true); setErro(""); setMensagem("");
    const { data, error } = await db.rpc("iniciar_rodada_validacao", { p_publicacao_id: confirmacao.publicacao.id });
    setProcessando(false);
    if (error) { setErro(error.message || "Não foi possível iniciar a rodada."); return; }
    const rodada = Array.isArray(data) ? data[0] : data;
    setMensagem(`Rodada iniciada. ${Number(rodada?.quantidade_estimada ?? confirmacao.estimativa)} Validadores elegíveis estimados; ${moeda(rodada?.valor_reservado ?? confirmacao.valor)} reservados na carteira.`);
    setConfirmacao(null);
    await carregar();
  }

  const rodadasAtivas = rodadas.filter((r) => r.status === "em_andamento");
  const statusLabel: Record<string, string> = { rascunho: "Rascunho", em_validacao: "Em validação", aprovada: "Aprovada", publicada: "Publicada" };
  return (
    <section className="space-y-5">
      <header><h2 className="text-2xl font-bold text-foreground">Validações</h2><p className="mt-1 text-sm text-muted-foreground">Confira a disponibilidade de Validadores e reserve o pacote mínimo antes de iniciar uma rodada.</p></header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}
      {confirmacao && <article className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
        <h3 className="font-semibold text-foreground">Confirmar validação</h3>
        <p className="text-sm text-muted-foreground">{confirmacao.publicacao.categorias?.nome ?? "Publicação"} · {confirmacao.publicacao.legenda}</p>
        <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Validadores elegíveis estimados</dt><dd className="text-xl font-bold text-foreground">{confirmacao.estimativa}</dd></div><div><dt className="text-xs text-muted-foreground">Valor que será reservado</dt><dd className="text-xl font-bold text-foreground">{moeda(confirmacao.valor)}</dd></div></dl>
        <p className="text-xs text-muted-foreground">A estimativa pode mudar até a confirmação. O banco revalida a disponibilidade e o saldo dentro da mesma transação que cria a rodada.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={processando} onClick={() => void confirmar()}>{processando ? "Processando..." : "Confirmar e reservar"}</Button><Button variant="outline" disabled={processando} onClick={() => setConfirmacao(null)}>Cancelar</Button></div>
      </article>}
      <div className="space-y-3"><h3 className="font-semibold text-foreground">Publicações disponíveis para validação</h3>
        {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando...</p> : publicacoes.filter((p) => ["rascunho","aprovada","em_validacao"].includes(p.status)).length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhuma publicação disponível.</p> : publicacoes.filter((p) => ["rascunho","aprovada","em_validacao"].includes(p.status)).map((p) => {
          const ativa = rodadasAtivas.find((r) => r.publicacao_id === p.id);
          return <article key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-foreground">{p.categorias?.nome ?? "Publicação"}</h4><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{statusLabel[p.status]}</span></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.legenda}</p>
              {p.revisao_admin_pendente && <p className="mt-1 text-xs font-medium text-amber-700">Aguardando revisão do Admin; contratação bloqueada.</p>}
              {ativa && <p className="mt-1 text-xs text-muted-foreground">Rodada ativa · {ativa.quantidade_contratada} elegíveis estimados · {moeda(ativa.valor_reservado)} reservados</p>}
            </div>
            {ativa ? <span className="text-sm font-medium text-muted-foreground">Rodada em andamento</span> : <Button size="sm" disabled={processando || p.revisao_admin_pendente || !["rascunho","aprovada"].includes(p.status)} onClick={() => void preparar(p)}>Validar esta publicação</Button>}
          </article>;
        })}
      </div>
      <div className="space-y-3"><h3 className="font-semibold text-foreground">Rodadas de validação</h3>
        {rodadas.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma rodada contratada até o momento.</p> : rodadas.map((r) => <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm"><div><p className="font-semibold text-foreground">Rodada {r.id.slice(0,8)}</p><p className="text-muted-foreground">{r.quantidade_concluida} de {r.quantidade_contratada} concluídas</p></div><div className="text-right"><p className="font-semibold text-foreground">{moeda(r.valor_reservado)}</p><p className="text-xs text-muted-foreground">{r.status === "em_andamento" ? "Em andamento" : r.status}</p></div></article>)}
      </div>
    </section>
  );
}
