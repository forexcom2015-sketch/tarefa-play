export function metadadosPagina(titulo: string, descricao: string, privada = true) {
  return {
    meta: [
      { title: `${titulo} — Tarefa-Play` },
      { name: "description", content: descricao },
      ...(privada ? [{ name: "robots", content: "noindex" }] : []),
      { property: "og:title", content: `${titulo} — Tarefa-Play` },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
