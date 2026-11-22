import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerificacoesSegurancaPanel } from "./VerificacoesSegurancaPanel";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));

describe("VerificacoesSegurancaPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it("executa uma única verificação automática ao abrir, inclusive em StrictMode", async () => {
    render(
      <StrictMode>
        <VerificacoesSegurancaPanel />
      </StrictMode>,
    );

    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledWith("executar_verificacoes_seguranca");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
