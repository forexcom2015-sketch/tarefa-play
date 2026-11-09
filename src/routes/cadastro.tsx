import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AreaLayout";

type Perfil = "validador" | "anunciante";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (s: Record<string, unknown>): { perfil?: Perfil } => ({
    perfil: s.perfil === "anunciante" ? "anunciante" : s.perfil === "validador" ? "validador" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Criar conta — Tarefa-Play" },
      { name: "description", content: "Crie sua conta de Validador ou Anunciante no Tarefa-Play." },
      { property: "og:title", content: "Criar conta — Tarefa-Play" },
      { property: "og:description", content: "Cadastre-se como Validador ou Anunciante." },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const search = Route.useSearch();
  const [perfil, setPerfil] = useState<Perfil>(search.perfil ?? "validador");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: `${window.location.origin}/entrar`, data: { nome, perfil } },
    });
    setCarregando(false);
    if (error) return setErro(error.message);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="w-full max-w-sm space-y-3 rounded-xl bg-card p-6 text-center shadow-sm">
          <Logo />
          <h1 className="text-xl font-bold text-foreground">Confirme seu e-mail</h1>
          <p className="text-sm text-muted-foreground">Enviamos um link para {email}. Depois de confirmar, é só entrar.</p>
          <Link to="/entrar" className="font-semibold text-primary">Ir para Entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 shadow-sm">
        <Logo />
        <h1 className="text-xl font-bold text-foreground">Criar conta</h1>
        <div className="grid grid-cols-2 gap-2">
          {(["validador", "anunciante"] as const).map((p) => (
            <Button key={p} type="button" variant={perfil === p ? "default" : "outline"} onClick={() => setPerfil(p)}>
              {p === "validador" ? "Validador" : "Anunciante"}
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" className="w-full" disabled={carregando}>{carregando ? "Criando..." : "Criar conta"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/entrar" className="font-semibold text-primary">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
