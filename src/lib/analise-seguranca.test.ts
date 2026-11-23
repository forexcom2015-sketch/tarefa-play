import { describe, expect, it } from "vitest";
import {
  AnaliseSegurancaSchema,
  normalizarAnaliseSeguranca,
  SelecaoVerificacoesSchema,
} from "./analise-seguranca";

const id = (numero: number) => `00000000-0000-4000-8000-${String(numero).padStart(12, "0")}`;

describe("seleção para análise de segurança", () => {
  it("aceita de 1 a 10 verificações distintas", () => {
    expect(SelecaoVerificacoesSchema.safeParse({ verificacaoIds: [id(1)] }).success).toBe(true);
    expect(
      SelecaoVerificacoesSchema.safeParse({
        verificacaoIds: Array.from({ length: 10 }, (_, i) => id(i + 1)),
      }).success,
    ).toBe(true);
    expect(
      SelecaoVerificacoesSchema.safeParse({
        verificacaoIds: Array.from({ length: 11 }, (_, i) => id(i + 1)),
      }).success,
    ).toBe(false);
  });

  it("recusa seleção vazia ou repetida", () => {
    expect(SelecaoVerificacoesSchema.safeParse({ verificacaoIds: [] }).success).toBe(false);
    expect(SelecaoVerificacoesSchema.safeParse({ verificacaoIds: [id(1), id(1)] }).success).toBe(
      false,
    );
  });
});

describe("normalização das ações corretivas", () => {
  it("limita a cinco ações e renumera pela ordem de prioridade", () => {
    const analise = AnaliseSegurancaSchema.parse({
      nivel_geral: "alto",
      resumo_riscos: "  Riscos que exigem revisão.  ",
      acoes_priorizadas: Array.from({ length: 6 }, (_, i) => ({
        prioridade: 99,
        risco: ` Risco ${i + 1} `,
        acao: ` Ação ${i + 1} `,
        justificativa: " Justificativa ",
      })),
    });

    const normalizada = normalizarAnaliseSeguranca(analise);
    expect(normalizada.acoes_priorizadas).toHaveLength(5);
    expect(normalizada.acoes_priorizadas.map((acao) => acao.prioridade)).toEqual([1, 2, 3, 4, 5]);
    expect(normalizada.resumo_riscos).toBe("Riscos que exigem revisão.");
  });
});
