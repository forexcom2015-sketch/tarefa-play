import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/** Anexa a sessão do navegador; o servidor valida o token em requireSupabaseAuth. */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return next();
    return next({ headers: { Authorization: `Bearer ${session.access_token}` } });
  },
);
