import { describe, expect, it } from "vitest";
import { linkValido } from "./redes";

describe("links por rede", () => {
  it("aceita link de post do Instagram", () => expect(linkValido("instagram", "https://www.instagram.com/p/Abc123")).toBe(true));
  it("recusa link do YouTube na página do Instagram", () => expect(linkValido("instagram", "https://youtu.be/abcdef12")).toBe(false));
  it("aceita link do Facebook", () => expect(linkValido("facebook", "https://www.facebook.com/loja/posts/123")).toBe(true));
  it("aceita vídeo e shorts do YouTube", () => {
    expect(linkValido("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(linkValido("youtube", "https://youtube.com/shorts/abcdef12")).toBe(true);
  });
  it("recusa link sem https", () => expect(linkValido("facebook", "http://facebook.com/x")).toBe(false));
});
