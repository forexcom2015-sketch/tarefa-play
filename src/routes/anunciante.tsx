import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuLateral } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/anunciante")({
  ssr: false,
  beforeLoad: () => exigirPapel("anunciante"),
  head: () => ({ meta: [{ title: "Área do Anunciante — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuLateral titulo="Área do Anunciante" itens={[{ to: "/anunciante", label: "Painel" }]} />,
});
