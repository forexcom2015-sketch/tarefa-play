import { createFileRoute } from "@tanstack/react-router";
import { CarteiraFinanceira } from "@/components/CarteiraFinanceira";

export const Route = createFileRoute("/validador/")({
  component: () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Sua área de validação</h2>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe seus ganhos, valores pendentes e o progresso até o saque mínimo.</p>
      </section>
      <CarteiraFinanceira papel="validador" />
      <section className="rounded-lg border border-dashed border-border p-5">
        <h3 className="font-semibold text-foreground">Tarefas de validação</h3>
        <p className="mt-1 text-sm text-muted-foreground">A execução das tarefas será implementada nas próximas fases. Nenhuma tarefa pode ser iniciada por esta tela nesta etapa.</p>
      </section>
    </div>
  ),
});
