import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AreaLayout";
import { areaDoPapel, obterPapel } from "@/lib/papel";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Tarefa-Play" },
      { name: "description", content: "Acesse sua conta de Validador ou Anunciante no Tarefa-Play." },
      { property: "og:title", content: "Entrar — Tarefa-Play" },
      { property: "og:description", content: "Acesse sua conta no Tarefa-Play." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setCarregando(false);
      setErro(error.message.includes("confirm") ? "Confirme seu e-mail antes de entrar." : "E-mail ou senha incorretos.");
      return;
    }
    const papel = await obterPapel();
    setCarregando(false);
    if (!papel) return setErro("Sua conta ainda não tem um papel definido.");
    navigate({ to: areaDoPapel[papel] });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 shadow-sm">
        <Logo />
        <h1 className="text-xl font-bold text-foreground">Entrar</h1>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" className="w-full" disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/cadastro" className="font-semibold text-primary">Criar conta</Link>
        </p>
      </form>
    </div>
  );
}
