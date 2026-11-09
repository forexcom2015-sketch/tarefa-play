import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutMenuInferior } from "@/components/AreaLayout";
import { exigirPapel } from "@/lib/papel";

export const Route = createFileRoute("/validador")({
  ssr: false,
  beforeLoad: async () => {
    await exigirPapel("validador");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/entrar" });
    const db = supabase as any;
    const [contrato, interesses, perfil, documento, pix, social] = await Promise.all([
      db.from("aceites_contrato").select("id").eq("usuario_id", auth.user.id).limit(1),
      db.from("interesses_validador").select("categoria_id").eq("usuario_id", auth.user.id),
      db.from("cadastro_validadores").select("maior_de_18,consentimento_lgpd_interesses").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("documentos_usuarios").select("tipo_documento").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("contas_pix").select("aprovado").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("contas_sociais").select("status").eq("usuario_id", auth.user.id).eq("canal", "instagram").maybeSingle(),
    ]);
    const consultaComErro = [contrato, interesses, perfil, documento, pix, social].find((resultado) => resultado.error);
    if (consultaComErro?.error) {
      throw new Error("Não foi possível validar as aprovações do cadastro. Tente novamente.");
    }
    if (!contrato.data?.length || perfil.data?.maior_de_18 !== true || perfil.data?.consentimento_lgpd_interesses !== true || documento.data?.tipo_documento !== "cpf" || (interesses.data?.length ?? 0) < 3 || pix.data?.aprovado !== true || social.data?.status !== "aprovada") {
      throw redirect({ to: "/cadastro/completar" });
    }
  },
  head: () => ({ meta: [{ title: "Área do Validador — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuInferior titulo="Área do Validador" itens={[
    { to: "/validador", label: "Tarefas" },
    { to: "/validador/minhas-tarefas", label: "Minhas tarefas" },
    { to: "/validador/ganhos", label: "Ganhos" },
    { to: "/validador/perfil", label: "Perfil" },
  ]} />,
});
