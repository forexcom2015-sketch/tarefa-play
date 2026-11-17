import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/validador/ganhos")({
  head: () => metadadosPagina("Ganhos do Validador", "Consulte movimentações e solicite saques da sua carteira."),
  component: () => <CarteiraFinanceira papel="validador" />,
});
