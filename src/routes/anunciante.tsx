import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuAnunciante, TelaFalha } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/anunciante")({
  ssr: false,
  beforeLoad: () => exigirPapel("anunciante"),
  errorComponent: TelaFalha,
  head: () => metadadosPagina("Área do Anunciante", "Acesse as ferramentas da sua conta de Anunciante."),
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
