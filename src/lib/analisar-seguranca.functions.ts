import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SelecaoVerificacoesSchema, type AnaliseSeguranca } from "./analise-seguranca";
import { exigirAdministrador } from "./autorizacao-admin";

export const analisarVerificacoesSeguranca = createServerFn({ method: "POST" })
  .validator(SelecaoVerificacoesSchema)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<AnaliseSeguranca> => {
    await exigirAdministrador(context.supabase, context.userId);

    const { data: verificacoes, error: erroVerificacoes } = await context.supabase
      .from("verificacoes_seguranca")
      .select("id,titulo,status,verificado_em,observacoes")
      .in("id", data.verificacaoIds);

    if (erroVerificacoes)
      throw new Error("Não foi possível carregar as verificações selecionadas.");
    if (verificacoes.length !== data.verificacaoIds.length) {
      throw new Error(
        "Uma ou mais verificações não estão disponíveis. Atualize o histórico e selecione novamente.",
      );
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A análise com IA não está configurada neste ambiente.");

    const { analisarSegurancaComIA } = await import("./security-analysis.server");
    return analisarSegurancaComIA(getRequest(), apiKey, verificacoes);
  });
