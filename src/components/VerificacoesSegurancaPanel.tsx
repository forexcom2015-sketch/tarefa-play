import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { analisarVerificacoesSeguranca } from "@/lib/analisar-seguranca.functions";
import type { AnaliseSeguranca } from "@/lib/analise-seguranca";
import {
  formatarDataVerificacao,
  ROTULOS_STATUS_VERIFICACAO,
  type StatusVerificacaoSeguranca,
} from "@/lib/verificacoes-seguranca";

type VerificacaoSeguranca = Database["public"]["Tables"]["verificacoes_seguranca"]["Row"];
type NivelRisco = AnaliseSeguranca["nivel_geral"];

const CLASSES_STATUS: Record<StatusVerificacaoSeguranca, string> = {
  conforme: "bg-primary/10 text-primary",
  pendente: "bg-muted text-muted-foreground",
  atencao: "bg-destructive/10 text-destructive",
};

const ROTULOS_NIVEL: Record<NivelRisco, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
  critico: "Risco crítico",
};

export function VerificacoesSegurancaPanel() {
  const analisarComIA = useServerFn(analisarVerificacoesSeguranca);
  const [registros, setRegistros] = useState<VerificacaoSeguranca[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [analise, setAnalise] = useState<AnaliseSeguranca | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState("");
  const [erroAnalise, setErroAnalise] = useState("");
  const execucaoInicial = useRef(false);

  const executar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { error: erroExecucao } = await supabase.rpc("executar_verificacoes_seguranca");
    if (erroExecucao) {
      setErro(`Não foi possível executar as verificações automáticas. ${erroExecucao.message}`);
      setCarregando(false);
      return;
    }

    const { data, error: erroHistorico } = await supabase
      .from("verificacoes_seguranca")
      .select("*")
      .order("verificado_em", { ascending: false })
      .limit(100);

    if (erroHistorico) {
      setErro(
        `As verificações foram executadas, mas o histórico não pôde ser carregado. ${erroHistorico.message}`,
      );
    } else {
      setRegistros(data ?? []);
      setSelecionados([]);
      setAnalise(null);
      setErroAnalise("");
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (execucaoInicial.current) return;
    execucaoInicial.current = true;
    void executar();
  }, [executar]);

  function alternarSelecao(id: string) {
    setSelecionados((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    );
  }

  async function analisarSelecionadas() {
    if (selecionados.length === 0) return;
    setAnalisando(true);
    setErroAnalise("");
    setAnalise(null);

    try {
      const resultado = await analisarComIA({ data: { verificacaoIds: selecionados } });
      setAnalise(resultado);
    } catch (error) {
      setErroAnalise(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a análise com IA. Tente novamente.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-foreground">Verificações de segurança</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O sistema verifica automaticamente a proteção das tabelas ao abrir esta aba. Cada
            execução gera registros imutáveis, sem preenchimento manual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void executar()}
          disabled={carregando || analisando}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          {carregando ? "Verificando..." : "Verificar novamente"}
        </button>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {erro}
        </p>
      )}
      {carregando && (
        <p role="status" className="text-sm text-muted-foreground">
          Executando verificações de segurança...
        </p>
      )}

      {!carregando && registros.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {selecionados.length === 0
              ? "Selecione até 10 verificações para analisar."
              : `${selecionados.length} ${selecionados.length === 1 ? "verificação selecionada" : "verificações selecionadas"}.`}
          </p>
          <button
            type="button"
            disabled={selecionados.length === 0 || analisando}
            onClick={() => void analisarSelecionadas()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {analisando ? "Analisando com IA..." : "Analisar selecionadas com IA"}
          </button>
        </div>
      )}

      {erroAnalise && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {erroAnalise}
        </p>
      )}

      {analise && (
        <section
          className="space-y-4 rounded-lg border border-primary/30 bg-card p-5"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">Análise de riscos por IA</h3>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {ROTULOS_NIVEL[analise.nivel_geral]}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">{analise.resumo_riscos}</p>
          <ol className="space-y-3">
            {analise.acoes_priorizadas.map((item) => (
              <li
                key={`${item.prioridade}-${item.acao}`}
                className="rounded-md border border-border p-4"
              >
                <p className="text-xs font-semibold text-primary">Prioridade {item.prioridade}</p>
                <h4 className="mt-1 font-semibold text-foreground">{item.risco}</h4>
                <p className="mt-2 text-sm text-foreground">{item.acao}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.justificativa}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Sugestões geradas por IA. Revise o contexto antes de aplicar qualquer correção.
          </p>
        </section>
      )}

      <div className="space-y-3" aria-live="polite">
        {registros.map((registro) => {
          const dataFormatada = formatarDataVerificacao(registro.verificado_em);
          return (
            <article key={registro.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.includes(registro.id)}
                  onChange={() => alternarSelecao(registro.id)}
                  disabled={
                    analisando || (!selecionados.includes(registro.id) && selecionados.length >= 10)
                  }
                  aria-label={`Selecionar ${registro.titulo} de ${dataFormatada}`}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{registro.titulo}</h3>
                      <time
                        className="mt-1 block text-xs text-muted-foreground"
                        dateTime={registro.verificado_em}
                      >
                        {dataFormatada}
                      </time>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CLASSES_STATUS[registro.status]}`}
                    >
                      {ROTULOS_STATUS_VERIFICACAO[registro.status]}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {registro.observacoes ?? "Nenhuma observação registrada."}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!carregando && !erro && registros.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nenhuma verificação automática registrada até o momento.
        </p>
      )}
    </section>
  );
}
