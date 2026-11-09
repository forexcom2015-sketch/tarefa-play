import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PapelFinanceiro = "validador" | "anunciante";
type Lancamento = {
  id: string;
  tipo: string;
  valor: number | string;
  status: string;
  disponivel_em: string;
  criado_em: string;
};
type Resumo = { saldo: number | string };

const db = supabase as any;

const tipoLancamento: Record<string, string> = {
  deposito: "Depósito simulado",
  reserva: "Reserva de pacote",
  liberacao_reserva: "Liberação de reserva",
  pagamento_tarefa: "Pagamento de tarefa",
  comissao: "Comissão da plataforma",
  bonus: "Bônus",
  saque: "Saque",
  estorno: "Estorno",
  ajuste: "Ajuste",
};

function moeda(valor: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));
}

function dataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}

export function CarteiraFinanceira({ papel }: { papel: PapelFinanceiro }) {
  const [disponivel, setDisponivel] = useState(0);
  const [pendente, setPendente] = useState(0);
  const [reservado, setReservado] = useState(0);
  const [saqueMinimo, setSaqueMinimo] = useState(100);
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [indicacoes, setIndicacoes] = useState(0);
  const [nivel, setNivel] = useState("Bronze");
  const [tarefasValidas, setTarefasValidas] = useState(0);
  const [pixAprovado, setPixAprovado] = useState(false);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [valor, setValor] = useState(papel === "validador" ? "100" : "100");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setErro("Entre novamente para consultar sua carteira.");
      setCarregando(false);
      return;
    }
    const { error: carteiraError } = await db.rpc("obter_ou_criar_carteira");
    if (carteiraError) {
      setErro("A carteira ainda não está disponível. A migração financeira precisa ser aplicada no Supabase antes de habilitar este módulo.");
      setCarregando(false);
      return;
    }

    const [carteira, saldo, saldoPendente, saldoReservado, extrato, pix, indicacoesResult, nivelResult, tarefasResult, minimoResult] = await Promise.all([
      db.from("carteiras").select("codigo_indicacao").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("saldo_disponivel").select("saldo").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("saldo_pendente").select("saldo").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("saldo_reservado").select("saldo").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("lancamentos").select("id,tipo,valor,status,disponivel_em,criado_em").order("criado_em", { ascending: false }).limit(25),
      db.from("contas_pix").select("aprovado").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("indicacoes").select("id", { count: "exact", head: true }).eq("indicador_id", auth.user.id),
      db.from("niveis").select("nome,tarefas_validas_minimas,ordem").eq("ativo", true).order("ordem"),
      db.from("lancamentos").select("id", { count: "exact", head: true }).eq("tipo", "pagamento_tarefa").gt("valor", 0),
      db.rpc("obter_saque_minimo"),
    ]);

    const falha = carteira.error ?? saldo.error ?? saldoPendente.error ?? saldoReservado.error ?? extrato.error ?? indicacoesResult.error ?? pix.error ?? nivelResult.error ?? tarefasResult.error ?? minimoResult.error;
    if (falha) {
      setErro("Não foi possível carregar os dados financeiros. Confira se as migrations da Fase 4 foram aplicadas e se as permissões estão corretas.");
      setCarregando(false);
      return;
    }

    setCodigoIndicacao(carteira.data?.codigo_indicacao ?? "");
    setDisponivel(Number((saldo.data as Resumo | null)?.saldo ?? 0));
    setPendente(Number((saldoPendente.data as Resumo | null)?.saldo ?? 0));
    setReservado(Number((saldoReservado.data as Resumo | null)?.saldo ?? 0));
    setSaqueMinimo(Number(minimoResult.data ?? 100));
    setLancamentos((extrato.data ?? []) as Lancamento[]);
    setPixAprovado(pix.data?.aprovado === true);
    setIndicacoes(indicacoesResult.count ?? 0);

    const quantidade = tarefasResult.count ?? 0;
    setTarefasValidas(quantidade);
    const niveis = (nivelResult.data ?? []) as { nome: string; tarefas_validas_minimas: number }[];
    const niveisElegiveis = niveis.filter((item) => quantidade >= item.tarefas_validas_minimas);
    const atual = niveisElegiveis.length ? niveisElegiveis[niveisElegiveis.length - 1] : undefined;
    setNivel(atual?.nome ?? "Bronze");
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function copiarCodigo() {
    if (!codigoIndicacao) return;
    try {
      await navigator.clipboard.writeText(codigoIndicacao);
      setMensagem("Código de indicação copiado.");
      setErro("");
    } catch {
      setErro("Não foi possível copiar automaticamente. Selecione o código para copiá-lo.");
    }
  }

  async function depositarMock(event: React.FormEvent) {
    event.preventDefault();
    setProcessando(true);
    setErro("");
    setMensagem("");
    const { error } = await db.rpc("depositar_mock", { p_valor: Number(valor) });
    setProcessando(false);
    if (error) {
      setErro(error.message || "Depósito simulado indisponível.");
      return;
    }
    setMensagem("Depósito simulado registrado no livro-razão.");
    await carregar();
  }

  async function solicitarSaque(event: React.FormEvent) {
    event.preventDefault();
    setProcessando(true);
    setErro("");
    setMensagem("");
    const { error } = await db.rpc("solicitar_saque", { p_valor: Number(valor) });
    setProcessando(false);
    if (error) {
      setErro(error.message || "Não foi possível solicitar o saque.");
      return;
    }
    setMensagem("Solicitação registrada. O saldo foi reservado e o saque aguarda análise administrativa simulada.");
    await carregar();
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{papel === "validador" ? "Ganhos do Validador" : "Carteira do Anunciante"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Extrato baseado no livro-razão. Os valores exibidos não representam pagamentos reais.</p>
      </div>

      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">{mensagem}</p>}

      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando carteira...</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Saldo disponível</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{moeda(disponivel)}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Saldo pendente</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{moeda(pendente)}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Saldo reservado</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{moeda(reservado)}</p>
            </article>
          </div>

          {papel === "validador" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground">Progresso e nível</h3>
                <p className="mt-2 text-2xl font-bold text-primary">{nivel}</p>
                <p className="text-sm text-muted-foreground">{tarefasValidas} pagamentos de tarefas registrados</p>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Progresso até o saque mínimo</span><span>{Math.min(100, Math.round((disponivel / Math.max(saqueMinimo, 0.01)) * 100))}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, (disponivel / saqueMinimo) * 100))}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{moeda(disponivel)} de {moeda(saqueMinimo)} disponíveis</p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Os critérios dos níveis são configuráveis pela administração. A contagem acompanha os pagamentos registrados no livro-razão.</p>
              </article>
              <article className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground">Solicitar saque</h3>
                <p className="mt-1 text-sm text-muted-foreground">Mínimo atual: {moeda(saqueMinimo)}. A conta Pix precisa estar aprovada e pertencer ao titular do CPF cadastrado.</p>
                <p className="mt-2 text-sm">Pix: <strong>{pixAprovado ? "Aprovado" : "Aguardando aprovação"}</strong></p>
                <form onSubmit={solicitarSaque} className="mt-3 space-y-2">
                  <Label htmlFor="valor-saque">Valor do saque (R$)</Label>
                  <Input id="valor-saque" type="number" min={saqueMinimo} max={disponivel} step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} required />
                  <Button type="submit" className="w-full" disabled={processando || !pixAprovado || disponivel < saqueMinimo}>
                    {processando ? "Enviando..." : "Solicitar saque"}
                  </Button>
                </form>
                {!pixAprovado && <p className="mt-2 text-xs text-muted-foreground">Conclua a aprovação do Pix na etapa de cadastro para habilitar saques.</p>}
              </article>
            </div>
          ) : (
            <article className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">Depósito simulado</h3>
              <p className="mt-1 text-sm text-muted-foreground">Apenas para demonstração. Limite de R$ 10.000,00 por operação. Não há cobrança nem transferência bancária.</p>
              <form onSubmit={depositarMock} className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1 space-y-1">
                  <Label htmlFor="valor-deposito">Valor (R$)</Label>
                  <Input id="valor-deposito" type="number" min="0.01" max="10000" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} required />
                </div>
                <Button type="submit" disabled={processando}>{processando ? "Registrando..." : "Registrar depósito mock"}</Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">O recurso permanece desativado até que o Admin habilite financeiro_mock_ativo nas configurações.</p>
            </article>
          )}

          <article className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Indicação de nível único</h3>
                <p className="text-sm text-muted-foreground">Compartilhe seu código. Não existe comissão em cadeia ou indicação multinível.</p>
              </div>
              <span className="text-sm text-muted-foreground">{indicacoes} indicação(ões)</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-muted px-3 py-2 text-sm font-semibold tracking-wider">{codigoIndicacao || "Indisponível"}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copiarCodigo()} disabled={!codigoIndicacao}>Copiar código</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">O percentual de bônus é configurável. A liberação de bônus depende de evento elegível e autorização financeira; o cadastro da indicação, por si só, não gera crédito.</p>
          </article>
        </>
      )}

      <article className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Extrato financeiro</h3>
          <p className="text-xs text-muted-foreground">Últimos 25 lançamentos. Registros financeiros não podem ser editados ou excluídos.</p>
        </div>
        {lancamentos.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Nenhum lançamento registrado.</p> : (
          <div className="divide-y divide-border">
            {lancamentos.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{tipoLancamento[item.tipo] ?? item.tipo}</p>
                  <p className="text-xs text-muted-foreground">{dataHora(item.criado_em)} · {item.status === "simulado" ? "Simulado" : item.status === "solicitado" ? "Solicitado" : "Registrado"}</p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${Number(item.valor) < 0 ? "text-destructive" : "text-foreground"}`}>
                  {Number(item.valor) > 0 ? "+" : ""}{moeda(item.valor)}
                </p>
              </div>
            ))}
          </div>
        )}
      </article>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>Atualizar carteira</Button>
      </div>
    </section>
  );
}
