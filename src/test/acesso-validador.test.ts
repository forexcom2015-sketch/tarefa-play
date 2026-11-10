import { beforeEach, describe, expect, it, vi } from "vitest";

type Resposta = { data: unknown; error: { message: string } | null };

const estado = vi.hoisted(() => ({
  sessao: { user: { id: "usuario-1" } as { id: string } | null },
  filas: {} as Record<string, Resposta[]>,
}));

// Cada consulta consome a próxima resposta da sua fila: uma fila com duas respostas
// representa as duas tentativas que o código deve fazer quando algo falha.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: estado.sessao.user }, error: null }),
    },
    from: (tabela: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        limit: () => chain,
        maybeSingle: () => chain,
        then: (resolver: (v: Resposta) => unknown) =>
          Promise.resolve((estado.filas[tabela] ?? []).shift() ?? { data: null, error: null }).then(
            resolver,
          ),
      };
      return chain;
    },
  },
}));

const ok = (data: unknown): Resposta => ({ data, error: null });
const falha = (message = "rede fora do ar"): Resposta => ({ data: null, error: { message } });

import {
  FALHA_AO_CONFERIR_APROVACOES,
  cadastroIncompleto,
  obterAprovacoesValidador,
} from "@/lib/aprovacoes";
import { FALHA_AO_CONFERIR_ACESSO, exigirPapel } from "@/lib/papel";

/** Cadastro do Validador totalmente aprovado, com `vezes` respostas por consulta. */
function tudoAprovado(vezes = 1) {
  const repetir = (resposta: Resposta) => Array.from({ length: vezes }, () => resposta);
  estado.filas = {
    aceites_contrato: repetir(ok([{ id: "contrato-1" }])),
    interesses_validador: repetir(ok([{ categoria_id: "a" }, { categoria_id: "b" }, { categoria_id: "c" }])),
    cadastro_validadores: repetir(ok({ maior_de_18: true, consentimento_lgpd_interesses: true })),
    documentos_usuarios: repetir(ok({ tipo_documento: "cpf" })),
    contas_pix: repetir(ok({ aprovado: true })),
    contas_sociais: repetir(ok({ status: "aprovada" })),
  };
}

beforeEach(() => {
  estado.sessao.user = { id: "usuario-1" };
  estado.filas = {};
});

describe("Aprovações do Validador", () => {
  it("confere de novo quando uma consulta falha na primeira tentativa", async () => {
    tudoAprovado(2);
    estado.filas["documentos_usuarios"]![0] = falha();

    const aprovacoes = await obterAprovacoesValidador("usuario-1");

    expect(aprovacoes.socialAprovada).toBe(true);
    expect(aprovacoes.qtdInteresses).toBe(3);
    expect(cadastroIncompleto(aprovacoes)).toBe(false);
    // As duas tentativas aconteceram de fato: as duas respostas foram consumidas.
    expect(estado.filas["documentos_usuarios"]).toHaveLength(0);
  });

  it("avisa com uma mensagem clara quando a falha continua na segunda tentativa", async () => {
    tudoAprovado(2);
    estado.filas["documentos_usuarios"] = [falha(), falha()];

    await expect(obterAprovacoesValidador("usuario-1")).rejects.toThrow(
      FALHA_AO_CONFERIR_APROVACOES,
    );
  });

  it("considera o cadastro incompleto enquanto a conta do Instagram não for aprovada", async () => {
    tudoAprovado(1);
    estado.filas["contas_sociais"] = [ok({ status: "pendente" })];

    const aprovacoes = await obterAprovacoesValidador("usuario-1");

    expect(aprovacoes.socialAprovada).toBe(false);
    expect(cadastroIncompleto(aprovacoes)).toBe(true);
  });
});

describe("Guarda de papel", () => {
  it("confere de novo quando a consulta do papel falha na primeira tentativa", async () => {
    estado.filas["user_roles"] = [falha(), ok([{ role: "validador" }])];

    await expect(exigirPapel("validador")).resolves.toEqual({ papel: "validador" });
    expect(estado.filas["user_roles"]).toHaveLength(0);
  });

  it("avisa em vez de deslogar quando a consulta do papel falha duas vezes", async () => {
    estado.filas["user_roles"] = [falha(), falha()];

    await expect(exigirPapel("validador")).rejects.toThrow(FALHA_AO_CONFERIR_ACESSO);
  });

  it("manda quem não está logado para a tela de entrar", async () => {
    estado.sessao.user = null;

    await expect(exigirPapel("validador")).rejects.toMatchObject({
      options: { to: "/entrar" },
    });
  });
});
