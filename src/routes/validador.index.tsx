import { createFileRoute } from "@tanstack/react-router";
import { Vazio } from "@/components/AreaLayout";

export const Route = createFileRoute("/validador/")({
  component: () => <Vazio texto="Em breve: avaliações de produtos para você validar." />,
});
