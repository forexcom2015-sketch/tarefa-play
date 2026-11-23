import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerificacoesSegurancaPanel } from "./VerificacoesSegurancaPanel";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  analisar: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));

vi.mock("@/lib/analisar-seguranca.functions", () => ({
  analisarVerificacoesSeguranca: {},
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => mocks.analisar,
}));

const registro = {
  id: "00000000-0000-4000-8000-000000000001",
  titulo: "Proteção por RLS nas tabelas do aplicativo",
  status: "atencao",
  verificado_em: "2026-11-22T02:57:00.000Z",
  observacoes: "Uma tabela precisa de revisão.",
  registrado_por: "00000000-0000-4000-8000-000000000002",
  criado_em: "2026-11-22T02:57:00.000Z",
};

describe("VerificacoesSegurancaPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.analisar.mockResolvedValue({
      nivel_geral: "alto",
      resumo_riscos: "Há um ponto de acesso que precisa de revisão.",
      acoes_priorizadas: [
        {
          prioridade: 1,
          risco: "Tabela sem política",
          acao: "Revisar a política de acesso.",
          justificativa: "Reduz o risco de exposição.",
        },
      ],
    });
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

  it("envia somente as verificações escolhidas e apresenta as ações priorizadas", async () => {
    mocks.limit.mockResolvedValue({ data: [registro], error: null });
    render(<VerificacoesSegurancaPanel />);

    const selecao = await screen.findByRole("checkbox");
    fireEvent.click(selecao);
    fireEvent.click(screen.getByRole("button", { name: "Analisar selecionadas com IA" }));

    await screen.findByText("Análise de riscos por IA");
    expect(mocks.analisar).toHaveBeenCalledWith({ data: { verificacaoIds: [registro.id] } });
    expect(screen.getByText("Prioridade 1")).toBeInTheDocument();
    expect(screen.getByText("Revisar a política de acesso.")).toBeInTheDocument();
  });
});
