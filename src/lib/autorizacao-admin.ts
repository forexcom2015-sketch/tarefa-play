import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function exigirAdministrador(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: papel, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error("Não foi possível confirmar o seu acesso de administrador.");
  if (!papel) throw new Error("A análise de segurança é restrita a administradores.");
}
