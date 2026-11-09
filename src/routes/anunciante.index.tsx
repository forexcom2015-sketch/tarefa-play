import { createFileRoute } from "@tanstack/react-router";
import { Vazio } from "@/components/AreaLayout";

export const Route = createFileRoute("/anunciante/")({
  component: () => (
    <>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Painel do Anunciante</h1>
      <Vazio texto="Em breve: crie publicações e receba validações privadas do seu produto." />
    </>
  ),
});
