import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuAnunciante } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/anunciante")({
  ssr: false,
  beforeLoad: () => exigirPapel("anunciante"),
  head: () => ({ meta: [{ title: "Área do Anunciante — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuAnunciante titulo="Área do Anunciante" itens={[
    { to: "/anunciante", label: "Início" },
    { to: "/anunciante/publicacoes", label: "Publicações" },
    { to: "/anunciante/validacoes", label: "Validações" },
    { to: "/anunciante/carteira", label: "Carteira" },
    { to: "/anunciante/configuracoes", label: "Configurações" },
  ]} />,
});
