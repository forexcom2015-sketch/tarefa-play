import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";

export const Route = createFileRoute("/anunciante/")({
  component: () => (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-foreground">Painel do Anunciante</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulte seu saldo e acompanhe os valores reservados para futuras validações.</p>
      </section>
      <CarteiraFinanceira papel="anunciante" />
      <section className="rounded-lg border border-dashed border-border p-5">
        <h2 className="font-semibold text-foreground">Publicações e validações</h2>
        <p className="mt-1 text-sm text-muted-foreground">A criação de publicações e a contratação de pacotes serão implementadas nas próximas fases. A reserva financeira já possui operação transacional no banco, mas ainda não está conectada a um fluxo de publicação nesta tela.</p>
      </section>
    </div>
  ),
});
