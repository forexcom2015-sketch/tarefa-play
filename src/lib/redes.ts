export type Rede = "instagram" | "facebook" | "youtube";

export const redes: Record<Rede, { nome: string; acao: string; exemplo: string; padrao: RegExp }> = {
  instagram: { nome: "Instagram", acao: "comentário na publicação", exemplo: "https://www.instagram.com/p/...", padrao: /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i },
  facebook: { nome: "Facebook", acao: "comentário na publicação", exemplo: "https://www.facebook.com/...", padrao: /^https:\/\/((www|m|web)\.)?(facebook\.com|fb\.watch)\/.+/i },
  youtube: { nome: "YouTube", acao: "comentário no vídeo", exemplo: "https://www.youtube.com/watch?v=...", padrao: /^https:\/\/((www|m)\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{6,}/i },
};

export function linkValido(rede: Rede, link: string) {
  return redes[rede].padrao.test(link.trim());
}
