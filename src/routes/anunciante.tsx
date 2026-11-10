import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuAnunciante, TelaFalha } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/anunciante")({
  ssr: false,
  beforeLoad: () => exigirPapel("anunciante"),
  errorComponent: TelaFalha,
  head: () => ({ meta: [{ title: "Área do Anunciante — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuAnunciante titulo="Área do Anunciante" itens={[
    { to: "/anunciante", label: "Início" },
    { to: "/anunciante/publicacoes", label: "Publicações" },
    { to: "/anunciante/validacoes", label: "Validações" },
    { to: "/anunciante/tarefas", label: "Tarefas reais" },
    { to: "/anunciante/automacao", label: "Automação" },
    { to: "/anunciante/carteira", label: "Carteira" },
    { to: "/anunciante/configuracoes", label: "Configurações" },
  ]} />,
});
