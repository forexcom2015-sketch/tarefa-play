import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";

export const Route = createFileRoute("/validador/ganhos")({
  component: () => <CarteiraFinanceira papel="validador" />,
});
