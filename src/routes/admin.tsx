import { createFileRoute } from "@tanstack/react-router";
import { LayoutMenuLateral, TelaFalha } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => exigirPapel("admin"),
  errorComponent: TelaFalha,
  head: () => ({ meta: [{ title: "Admin — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuLateral titulo="Administração" itens={[{ to: "/admin", label: "Painel" }, { to: "/admin/cadastros", label: "Cadastros" }, { to: "/admin/tipos-tarefa", label: "Tipos de tarefa" }, { to: "/admin/chamados-token", label: "Chamados de token" }]} />,
});
