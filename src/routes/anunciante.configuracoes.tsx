import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/anunciante/configuracoes")({ component: ConfiguracoesAnunciante });

function ConfiguracoesAnunciante() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data, error } = await supabase.auth.getUser();
      if (!ativo) return;
      if (error || !data.user) setErro("Não foi possível carregar os dados da conta.");
      else {
        setEmail(data.user.email ?? "");
        const { data: perfil, error: perfilError } = await supabase.from("profiles").select("nome").eq("id", data.user.id).maybeSingle();
        if (perfilError) setErro("Não foi possível consultar o perfil.");
        else setNome(perfil?.nome ?? "");
      }
      setCarregando(false);
    }
    void carregar();
    return () => { ativo = false; };
  }, []);

  return (
    <section className="max-w-2xl space-y-4">
      <header><h2 className="text-2xl font-bold text-foreground">Configurações</h2><p className="mt-1 text-sm text-muted-foreground">Dados básicos da conta do Anunciante.</p></header>
      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando conta...</p> : <article className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div><p className="text-xs text-muted-foreground">Nome cadastrado</p><p className="font-medium text-foreground">{nome || "Não informado"}</p></div>
        <div><p className="text-xs text-muted-foreground">E-mail de acesso</p><p className="font-medium text-foreground">{email || "Não informado"}</p></div>
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">A edição de dados cadastrais e a alteração de credenciais permanecem no fluxo de conta e autenticação. Esta tela não expõe nem permite alterar dados protegidos.</p>
      </article>}
    </section>
  );
}
