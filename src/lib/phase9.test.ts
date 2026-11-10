import { describe, expect, it } from "vitest";
import { calcularCreditos, mensagemProgresso } from "./phase9";

describe("Fase 9 - liberação cíclica", () => {
  it("10 Instagram liberam 5 sites", () => {
    expect(calcularCreditos(10, 0, 0).site).toBe(5);
    expect(calcularCreditos(11, 0, 0).site).toBe(5);
  });

  it("a sexta visita é recusada após consumir os 5 créditos", () => {
    expect(calcularCreditos(10, 5, 0).site).toBe(0);
    expect(mensagemProgresso("site", 10, 5)).toContain("Nenhuma visita");
  });

  it("5 sites liberam 2 YouTube", () => {
    expect(calcularCreditos(10, 5, 0).youtube).toBe(2);
    expect(calcularCreditos(10, 5, 2).youtube).toBe(0);
  });

  it("os contadores são independentes por usuário e dia porque a função é pura", () => {
    expect(calcularCreditos(20, 0, 0)).toEqual({ site: 10, youtube: 0 });
    expect(calcularCreditos(0, 0, 0)).toEqual({ site: 0, youtube: 0 });
  });

  it("não acumula crédito de YouTube sem visitas validadas", () => {
    expect(calcularCreditos(100, 0, 0).youtube).toBe(0);
  });
});
