import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import iconeMarca from "@/assets/logo-icone.png.asset.json";

type Item = { to: string; label: string };

async function sair(navigate: ReturnType<typeof useNavigate>) {
  await supabase.auth.signOut();
  navigate({ to: "/entrar" });
}

export function Logo({ classe = "h-7 w-7" }: { classe?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src={iconeMarca.url} alt="" aria-hidden className={`${classe} shrink-0 rounded-lg`} />
      <span className="text-lg font-extrabold tracking-tight text-primary">
        Tarefa<span className="text-accent">-Play</span>
      </span>
    </span>
  );
}

/** Validador: mobile-first com menu inferior. */
export function LayoutMenuInferior({ titulo, itens }: { titulo: string; itens: Item[] }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => sair(navigate)}>Sair</Button>
      </header>
      <main className="mx-auto max-w-md p-4">
        <h1 className="mb-4 text-xl font-bold text-foreground">{titulo}</h1>
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-border bg-card py-2">
        {itens.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={{ exact: true }}
            className="px-3 py-1 text-xs font-medium text-muted-foreground"
            activeProps={{ className: "px-3 py-1 text-xs font-bold text-primary" }}
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Anunciante: menu lateral no desktop e inferior no celular. */
export function LayoutMenuAnunciante({ titulo, itens }: { titulo: string; itens: Item[] }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20 md:flex md:flex-row md:pb-0">
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-4 md:flex md:w-60 md:flex-col">
        <Logo />
        <p className="mt-1 text-xs text-muted-foreground">{titulo}</p>
        <nav className="mt-6 flex flex-col gap-2">
          {itens.map((i) => (
            <Link key={i.to} to={i.to} activeOptions={{ exact: true }}
              className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold bg-primary text-primary-foreground" }}>
              {i.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="mt-auto" onClick={() => sair(navigate)}>Sair</Button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => sair(navigate)}>Sair</Button>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 pb-6 md:p-6">
          <h1 className="mb-5 text-xl font-bold text-foreground md:hidden">{titulo}</h1>
          <Outlet />
        </main>
      </div>
      <nav aria-label="Navegação do Anunciante" className="fixed inset-x-0 bottom-0 z-20 flex gap-2 overflow-x-auto border-t border-border bg-card px-2 py-2 md:hidden">
        {itens.map((i) => (
          <Link key={i.to} to={i.to} activeOptions={{ exact: true }}
            className="shrink-0 px-2 py-2 text-center text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "shrink-0 px-2 py-2 text-center text-[11px] font-bold text-primary" }}>
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Admin: menu lateral. */
export function LayoutMenuLateral({ titulo, itens }: { titulo: string; itens: Item[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar p-4 md:w-60 md:border-b-0 md:border-r">
        <Logo />
        <p className="mt-1 text-xs text-muted-foreground">{titulo}</p>
        <nav className="mt-4 flex gap-2 md:flex-col">
          {itens.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              activeOptions={{ exact: true }}
              className="rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold bg-primary text-primary-foreground" }}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => sair(navigate)}>Sair</Button>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
