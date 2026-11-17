import { describe, expect, it } from "vitest";
import { caminhoCriativo } from "./criativos";

describe("caminhoCriativo", () => {
  it("mantém o caminho relativo usado pelos novos envios", () => {
    expect(caminhoCriativo("usuario/publicacao/imagem.png")).toBe("usuario/publicacao/imagem.png");
  });

  it("converte os links públicos já gravados em produção", () => {
    expect(caminhoCriativo("https://projeto.supabase.co/storage/v1/object/public/criativos-publicacoes/usuario/publicacao/minha%20imagem.png")).toBe("usuario/publicacao/minha imagem.png");
  });

  it("não aceita um endereço externo como caminho do bucket", () => {
    expect(caminhoCriativo("https://externo.example/imagem.png")).toBe("");
  });
});
