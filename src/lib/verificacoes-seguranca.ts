import type { Database } from "@/integrations/supabase/types";

export type StatusVerificacaoSeguranca =
  Database["public"]["Tables"]["verificacoes_seguranca"]["Row"]["status"];

export const ROTULOS_STATUS_VERIFICACAO: Record<StatusVerificacaoSeguranca, string> = {
  conforme: "Conforme",
  pendente: "Pendente",
  atencao: "Requer atenção",
};

export function formatarDataVerificacao(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}
