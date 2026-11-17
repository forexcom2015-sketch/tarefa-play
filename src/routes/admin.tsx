import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuLateral, TelaFalha } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => exigirPapel("admin"),
  errorComponent: TelaFalha,
  head: () => metadadosPagina("Admin", "Acesse as áreas administrativas do Tarefa-Play."),
  component: () => <LayoutMenuLateral titulo="Administração" itens={[{ to: "/admin", label: "Painel" }, { to: "/admin/cadastros", label: "Cadastros" }, { to: "/admin/tipos-tarefa", label: "Tipos de tarefa" }, { to: "/admin/chamados-token", label: "Chamados de token" }]} />,
});
