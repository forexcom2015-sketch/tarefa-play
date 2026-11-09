import { createFileRoute } from "@tanstack/react-router";
import { Vazio } from "@/components/AreaLayout";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Painel do Admin</h1>
      <Vazio texto="Em breve: configurações, categorias, auditoria e suporte." />
    </>
  ),
});
