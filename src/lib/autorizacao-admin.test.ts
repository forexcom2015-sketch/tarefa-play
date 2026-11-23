import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import { exigirAdministrador } from "./autorizacao-admin";

function clienteComPapel(role: "admin" | "validador") {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: role === "admin" ? { role: "admin" } : null,
    error: null,
  });
  const eqRole = vi.fn().mockReturnValue({ maybeSingle });
  const eqUser = vi.fn().mockReturnValue({ eq: eqRole });
  const select = vi.fn().mockReturnValue({ eq: eqUser });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("autorização da análise de segurança", () => {
  it("permite um administrador", async () => {
    await expect(
      exigirAdministrador(clienteComPapel("admin"), "admin-id"),
    ).resolves.toBeUndefined();
  });

  it("bloqueia um usuário sem papel Admin", async () => {
    await expect(exigirAdministrador(clienteComPapel("validador"), "validador-id")).rejects.toThrow(
      "A análise de segurança é restrita a administradores.",
    );
  });
});
