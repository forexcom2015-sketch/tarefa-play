import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AreaLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tarefa-Play — Seu produto avaliado por pessoas reais" },
      { name: "description", content: "Validação privada e honesta de produtos para pequenos vendedores online." },
      { property: "og:title", content: "Tarefa-Play — Seu produto avaliado por pessoas reais" },
      { property: "og:description", content: "Validação privada e honesta de produtos para pequenos vendedores online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// Fase 1: página inicial provisória. A homepage educativa completa vem na Fase 2.
function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/entrar">Entrar</Link></Button>
          <Button asChild size="sm"><Link to="/cadastro">Criar conta</Link></Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-extrabold text-foreground">Seu produto avaliado por pessoas reais. Sem filtro.</h1>
        <p className="text-muted-foreground">Em construção.</p>
      </main>
    </div>
  );
}
