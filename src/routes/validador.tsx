import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuInferior } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/validador")({
  ssr: false,
  beforeLoad: () => exigirPapel("validador"),
  head: () => ({ meta: [{ title: "Área do Validador — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuInferior titulo="Área do Validador" itens={[{ to: "/validador", label: "Início" }]} />,
});
