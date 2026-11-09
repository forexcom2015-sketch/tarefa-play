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
    const [contrato, interesses, pix, social] = await Promise.all([
      db.from("aceites_contrato").select("id").eq("usuario_id", auth.user.id).limit(1),
      db.from("interesses_validador").select("categoria_id").eq("usuario_id", auth.user.id),
      db.from("contas_pix").select("aprovado").eq("usuario_id", auth.user.id).maybeSingle(),
      db.from("contas_sociais").select("status").eq("usuario_id", auth.user.id).eq("canal", "instagram").maybeSingle(),
    ]);
    if (!contrato.data?.length || (interesses.data?.length ?? 0) < 3 || pix.data?.aprovado !== true || social.data?.status !== "aprovada") {
      throw redirect({ to: "/cadastro/completar" });
    }
  },
  head: () => ({ meta: [{ title: "Área do Validador — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: () => <LayoutMenuInferior titulo="Área do Validador" itens={[{ to: "/validador", label: "Início" }]} />,
});
