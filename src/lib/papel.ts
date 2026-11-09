import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "validador" | "anunciante" | "admin";

export const areaDoPapel: Record<Papel, "/validador" | "/anunciante" | "/admin"> = {
  validador: "/validador",
  anunciante: "/anunciante",
  admin: "/admin",
};

/** Lê o papel do usuário logado (admin tem prioridade). Retorna null se não logado. */
export async function obterPapel(): Promise<Papel | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const lista = (roles ?? []).map((r) => r.role as Papel);
  if (lista.includes("admin")) return "admin";
  if (lista.includes("anunciante")) return "anunciante";
  if (lista.includes("validador")) return "validador";
  return null;
}

/** Guarda de rota: exige login e o papel informado; caso contrário, volta à própria área. */
export async function exigirPapel(papel: Papel) {
  const atual = await obterPapel();
  if (!atual) throw redirect({ to: "/entrar" });
  if (atual !== papel) throw redirect({ to: areaDoPapel[atual] });
  return { papel: atual };
}
