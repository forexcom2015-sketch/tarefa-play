import { supabase } from "@/integrations/supabase/client";

/** Mensagem mostrada quando as aprovações do cadastro não puderam ser conferidas. */
export const FALHA_AO_CONFERIR_APROVACOES =
  "Não foi possível conferir as aprovações do seu cadastro agora. Verifique sua conexão e tente novamente.";

const ESPERA_NOVA_TENTATIVA = 600;
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

type Resultado = { data: any; error: { message: string } | null };

async function consultarAprovacoes(usuarioId: string): Promise<Resultado[]> {
  const db = supabase as any;
  return Promise.all([
    db.from("aceites_contrato").select("id").eq("usuario_id", usuarioId).limit(1),
    db.from("interesses_validador").select("categoria_id").eq("usuario_id", usuarioId),
    db.from("cadastro_validadores").select("maior_de_18,consentimento_lgpd_interesses").eq("usuario_id", usuarioId).maybeSingle(),
    db.from("documentos_usuarios").select("tipo_documento").eq("usuario_id", usuarioId).maybeSingle(),
    db.from("contas_pix").select("aprovado").eq("usuario_id", usuarioId).maybeSingle(),
    db.from("contas_sociais").select("status").eq("usuario_id", usuarioId).eq("canal", "instagram").maybeSingle(),
  ]);
}

/**
 * Confere as aprovações do Validador. Se alguma consulta falhar — rede instável,
 * token em renovação — tenta mais uma vez antes de desistir.
 */
export async function obterAprovacoesValidador(usuarioId: string) {
  let resultados = await consultarAprovacoes(usuarioId);
  if (resultados.some((resultado) => resultado.error)) {
    await esperar(ESPERA_NOVA_TENTATIVA);
    resultados = await consultarAprovacoes(usuarioId);
  }
  if (resultados.some((resultado) => resultado.error)) {
    throw new Error(FALHA_AO_CONFERIR_APROVACOES);
  }

  const [contrato, interesses, perfil, documento, pix, social] =
    resultados as [Resultado, Resultado, Resultado, Resultado, Resultado, Resultado];
  return {
    aceitouContrato: (contrato.data?.length ?? 0) > 0,
    qtdInteresses: interesses.data?.length ?? 0,
    maiorDe18: perfil.data?.maior_de_18 === true,
    consentiuInteresses: perfil.data?.consentimento_lgpd_interesses === true,
    tipoDocumento: (documento.data?.tipo_documento ?? null) as string | null,
    pixAprovado: pix.data?.aprovado === true,
    socialAprovada: social.data?.status === "aprovada",
  };
}

export type AprovacoesValidador = Awaited<ReturnType<typeof obterAprovacoesValidador>>;

/** Regras de liberação do Validador: tudo aprovado, senão volta para completar o cadastro. */
export function cadastroIncompleto(aprovacoes: AprovacoesValidador) {
  return (
    !aprovacoes.aceitouContrato ||
    !aprovacoes.maiorDe18 ||
    !aprovacoes.consentiuInteresses ||
    aprovacoes.tipoDocumento !== "cpf" ||
    aprovacoes.qtdInteresses < 3 ||
    !aprovacoes.pixAprovado ||
    !aprovacoes.socialAprovada
  );
}
