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
    const { data: auth } = await supabase.auth.getUser();
    const db = supabase as any;
    if (papel === "validador" && auth.user) {
      const [contrato, perfil, interesses, pix, social] = await Promise.all([
        db.from("aceites_contrato").select("id").eq("usuario_id", auth.user.id).limit(1),
        db.from("cadastro_validadores").select("usuario_id").eq("usuario_id", auth.user.id).maybeSingle(),
        db.from("interesses_validador").select("categoria_id").eq("usuario_id", auth.user.id),
        db.from("contas_pix").select("aprovado").eq("usuario_id", auth.user.id).maybeSingle(),
        db.from("contas_sociais").select("status").eq("usuario_id", auth.user.id).eq("canal", "instagram").maybeSingle(),
      ]);
      const cadastroBaseCompleto = Boolean(contrato.data?.length && perfil.data && (interesses.data?.length ?? 0) >= 3 && pix.data && social.data);
      const aprovadoParaTarefas = pix.data?.aprovado === true && social.data?.status === "aprovada";
      if (!cadastroBaseCompleto || !aprovadoParaTarefas) {
        setCarregando(false);
        navigate({ to: "/cadastro/completar" });
        return;
      }
    }
    if (papel === "anunciante" && auth.user) {
      const [contrato, perfil, documento] = await Promise.all([
        db.from("aceites_contrato").select("id").eq("usuario_id", auth.user.id).limit(1),
        db.from("cadastro_anunciantes").select("usuario_id").eq("usuario_id", auth.user.id).maybeSingle(),
        db.from("documentos_usuarios").select("usuario_id").eq("usuario_id", auth.user.id).maybeSingle(),
      ]);
      if (!contrato.data?.length || !perfil.data || !documento.data) {
        setCarregando(false);
        navigate({ to: "/cadastro/completar" });
        return;
      }
    }
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
