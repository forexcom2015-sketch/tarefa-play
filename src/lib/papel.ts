import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "validador" | "anunciante" | "admin";

export const areaDoPapel: Record<Papel, "/validador" | "/anunciante" | "/admin"> = {
  validador: "/validador",
  anunciante: "/anunciante",
  admin: "/admin",
};

/** Mensagem mostrada quando o acesso não pôde ser confirmado. */
export const FALHA_AO_CONFERIR_ACESSO =
  "Não foi possível confirmar o seu acesso agora. Verifique sua conexão e tente novamente.";

const ESPERA_NOVA_TENTATIVA = 600;
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

type LeituraPapel = { papel: Papel | null; falha: boolean };

async function lerPapel(): Promise<LeituraPapel> {
  const { data } = await supabase.auth.getUser();
  // Sem usuário não é falha: está deslogado e deve voltar para a tela de entrar.
  if (!data.user) return { papel: null, falha: false };
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  if (error) return { papel: null, falha: true };
  const lista = (roles ?? []).map((r) => r.role as Papel);
  if (lista.includes("admin")) return { papel: "admin", falha: false };
  if (lista.includes("anunciante")) return { papel: "anunciante", falha: false };
  if (lista.includes("validador")) return { papel: "validador", falha: false };
  return { papel: null, falha: false };
}

/** Lê o papel do usuário logado (admin tem prioridade). Retorna null se não logado. */
export async function obterPapel(): Promise<Papel | null> {
  return (await lerPapel()).papel;
}

/** Guarda de rota: exige login e o papel informado; caso contrário, volta à própria área. */
export async function exigirPapel(papel: Papel) {
  let leitura = await lerPapel();
  // Falha de consulta costuma ser momentânea: tenta de novo antes de desistir.
  if (leitura.falha) {
    await esperar(ESPERA_NOVA_TENTATIVA);
    leitura = await lerPapel();
  }
  if (leitura.falha) throw new Error(FALHA_AO_CONFERIR_ACESSO);
  if (!leitura.papel) throw redirect({ to: "/entrar" });
  if (leitura.papel !== papel) throw redirect({ to: areaDoPapel[leitura.papel] });
  return { papel: leitura.papel };
}
