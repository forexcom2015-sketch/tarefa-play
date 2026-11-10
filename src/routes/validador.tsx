import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutMenuInferior, TelaFalha } from "@/components/AreaLayout";
import { cadastroIncompleto, obterAprovacoesValidador } from "@/lib/aprovacoes";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/validador")({
  ssr: false,
  beforeLoad: async () => {
    await exigirPapel("validador");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/entrar" });
    const aprovacoes = await obterAprovacoesValidador(auth.user.id);
    if (cadastroIncompleto(aprovacoes)) throw redirect({ to: "/cadastro/completar" });
  },
  head: () => ({ meta: [{ title: "Área do Validador — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  errorComponent: TelaFalha,
  component: () => <LayoutMenuInferior titulo="Área do Validador" itens={[
    { to: "/validador", label: "Tarefas" },
    { to: "/validador/minhas-tarefas", label: "Minhas tarefas" },
    { to: "/validador/ganhos", label: "Ganhos" },
    { to: "/validador/perfil", label: "Perfil" },
  ]} />,
});
