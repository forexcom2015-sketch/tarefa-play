import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/anunciante/carteira")({
  head: () => metadadosPagina("Carteira do Anunciante", "Consulte saldo, reservas e movimentações da sua carteira."),
  component: () => <CarteiraFinanceira papel="anunciante" />,
});
