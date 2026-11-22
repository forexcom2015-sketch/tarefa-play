import { describe, expect, it } from "vitest";
import { formatarDataVerificacao, ROTULOS_STATUS_VERIFICACAO } from "./verificacoes-seguranca";

describe("verificações de segurança", () => {
  it("apresenta os três status permitidos", () => {
    expect(ROTULOS_STATUS_VERIFICACAO).toEqual({
      conforme: "Conforme",
      pendente: "Pendente",
      atencao: "Requer atenção",
    });
  });

  it("apresenta a data no fuso de São Paulo", () => {
    expect(formatarDataVerificacao("2026-11-22T02:57:00.000Z")).toBe("21/11/2026, 23:57");
  });

  it("não apresenta uma data inválida como se fosse válida", () => {
    expect(formatarDataVerificacao("data-inexistente")).toBe("Data inválida");
  });
});
