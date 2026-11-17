import { describe, expect, it } from "vitest";
import { celulaCsvSegura, gerarCsv } from "./csv";

describe("celulaCsvSegura", () => {
  it.each(["=1+1", "+1+1", "-1+1", "@ comando", "  =1+1", "\t=1+1"])(
    "neutraliza fórmula iniciada por %j",
    (valor) => {
      expect(celulaCsvSegura(valor)).toBe(`"'${valor}"`);
    },
  );

  it("preserva um nome de usuário comum", () => {
    expect(celulaCsvSegura("validador.teste_01")).toBe('"validador.teste_01"');
  });

  it("escapa aspas sem alterar o conteúdo", () => {
    expect(celulaCsvSegura('nome "teste"')).toBe('"nome ""teste"""');
  });
});

describe("gerarCsv", () => {
  it("aplica a proteção em todas as colunas", () => {
    expect(gerarCsv(["@", "codigo"], [["=1+1", "+codigo"]])).toBe(
      '"\'@","codigo"\r\n"\'=1+1","\'+codigo"',
    );
  });
});
