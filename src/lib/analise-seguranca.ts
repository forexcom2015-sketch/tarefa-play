import { z } from "zod";

export const SelecaoVerificacoesSchema = z.object({
  verificacaoIds: z
    .array(z.string().uuid())
    .min(1, "Selecione ao menos uma verificação.")
    .max(10, "Selecione no máximo 10 verificações por análise.")
    .refine((ids) => new Set(ids).size === ids.length, "Não repita verificações na mesma análise."),
});

export const AcaoCorretivaSchema = z.strictObject({
  prioridade: z.number().int(),
  risco: z.string(),
  acao: z.string(),
  justificativa: z.string(),
});

export const AnaliseSegurancaSchema = z.strictObject({
  nivel_geral: z.enum(["baixo", "medio", "alto", "critico"]),
  resumo_riscos: z.string(),
  acoes_priorizadas: z.array(AcaoCorretivaSchema),
});

export type AnaliseSeguranca = z.infer<typeof AnaliseSegurancaSchema>;
export type SelecaoVerificacoes = z.infer<typeof SelecaoVerificacoesSchema>;

export function normalizarAnaliseSeguranca(analise: AnaliseSeguranca): AnaliseSeguranca {
  const acoes = analise.acoes_priorizadas.slice(0, 5).map((acao, indice) => ({
    prioridade: indice + 1,
    risco: acao.risco.trim(),
    acao: acao.acao.trim(),
    justificativa: acao.justificativa.trim(),
  }));

  if (
    !analise.resumo_riscos.trim() ||
    acoes.length === 0 ||
    acoes.some((acao) => !acao.risco || !acao.acao)
  ) {
    throw new Error("A análise retornou conteúdo incompleto. Tente gerar novamente.");
  }

  return {
    nivel_geral: analise.nivel_geral,
    resumo_riscos: analise.resumo_riscos.trim(),
    acoes_priorizadas: acoes,
  };
}
