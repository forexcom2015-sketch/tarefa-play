import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";

export const Route = createFileRoute("/anunciante/carteira")({
  component: () => <CarteiraFinanceira papel="anunciante" />,
});
