import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  formatarDataVerificacao,
  ROTULOS_STATUS_VERIFICACAO,
  type StatusVerificacaoSeguranca,
} from "@/lib/verificacoes-seguranca";

type VerificacaoSeguranca =
  Database["public"]["Tables"]["verificacoes_seguranca"]["Row"];

const CLASSES_STATUS: Record<StatusVerificacaoSeguranca, string> = {
  conforme: "bg-primary/10 text-primary",
  pendente: "bg-muted text-muted-foreground",
  atencao: "bg-destructive/10 text-destructive",
};

export function VerificacoesSegurancaPanel() {
  const [registros, setRegistros] = useState<VerificacaoSeguranca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const executar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const { error: erroExecucao } = await supabase.rpc(
      "executar_verificacoes_seguranca",
    );
    if (erroExecucao) {
      setErro(
        `Não foi possível executar as verificações automáticas. ${erroExecucao.message}`,
      );
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
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void executar();
  }, [executar]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-foreground">
            Verificações de segurança
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O sistema verifica automaticamente a proteção das tabelas ao abrir
            esta aba. Cada execução gera registros imutáveis, sem preenchimento
            manual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void executar()}
          disabled={carregando}
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

      <div className="space-y-3" aria-live="polite">
        {registros.map((registro) => (
          <article
            key={registro.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">
                  {registro.titulo}
                </h3>
                <time
                  className="mt-1 block text-xs text-muted-foreground"
                  dateTime={registro.verificado_em}
                >
                  {formatarDataVerificacao(registro.verificado_em)}
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
          </article>
        ))}
      </div>

      {!carregando && !erro && registros.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nenhuma verificação automática registrada até o momento.
        </p>
      )}
    </section>
  );
}
