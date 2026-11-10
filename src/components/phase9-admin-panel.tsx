import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

type Regra = {
  id: string;
  origem: { id: string; nome: string; canal: string };
  destino: { id: string; nome: string; canal: string };
  quantidade_requisito: number;
  quantidade_liberada: number;
  ciclica: boolean;
  ativo: boolean;
};

type Bloqueio = {
  id: string;
  validador_id: string;
  motivo: string;
  inicio: string;
  fim: string;
  origem: string;
  status: string;
  contestado: boolean;
};

type Contestacao = {
  id: string;
  bloqueio_id: string;
  validador_id: string;
  texto: string;
  status: string;
  criado_em: string;
};

type DadosAdmin = {
  regras: Regra[];
  bloqueios: Bloqueio[];
  contestacoes: Contestacao[];
};

const rpc = supabase as unknown as RpcClient;

export function Phase9AdminPanel() {
  const [dados, setDados] = useState<DadosAdmin>({ regras: [], bloqueios: [], contestacoes: [] });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const result = await rpc.rpc("obter_dados_admin_fase9");
    if (result.error) {
      setErro(result.error.message || "Não foi possível carregar os dados da Fase 9.");
    } else {
      const payload = (result.data ?? {}) as Partial<DadosAdmin>;
      setDados({
        regras: payload.regras ?? [],
        bloqueios: payload.bloqueios ?? [],
        contestacoes: payload.contestacoes ?? [],
      });
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarRegra(regra: Regra) {
    setSalvando(regra.id);
    setErro("");
    setMensagem("");
    const result = await rpc.rpc("salvar_regra_liberacao", {
      p_id: regra.id,
      p_tipo_origem_id: regra.origem.id,
      p_quantidade_requisito: regra.quantidade_requisito,
      p_tipo_destino_id: regra.destino.id,
      p_quantidade_liberada: regra.quantidade_liberada,
      p_ciclica: regra.ciclica,
      p_ativo: regra.ativo,
    });
    setSalvando(null);
    if (result.error) setErro(result.error.message || "Não foi possível salvar a regra.");
    else setMensagem("Regra de liberação salva e auditada.");
    await carregar();
  }

  async function decidir(id: string, decisao: "aceita" | "negada") {
    setSalvando(id);
    setErro("");
    setMensagem("");
    const result = await rpc.rpc("decidir_contestacao_bloqueio", {
      p_contestacao_id: id,
      p_decisao: decisao,
    });
    setSalvando(null);
    if (result.error) setErro(result.error.message || "Não foi possível decidir a contestação.");
    else setMensagem(decisao === "aceita" ? "Contestação aceita; bloqueio levantado." : "Contestação negada; bloqueio mantido.");
    await carregar();
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-foreground">Liberação e bloqueios — Fase 9</h2>
        <p className="text-sm text-muted-foreground">
          Regras, bloqueios ativos e contestações. As alterações de regras e decisões são registradas na auditoria.
        </p>
      </header>

      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">{mensagem}</p>}

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">Regras de liberação</h3>
          <p className="text-xs text-muted-foreground">O ciclo inicial é 10 Instagram → 5 Site e 5 Site → 2 YouTube, sem teto diário.</p>
        </div>
        {dados.regras.map((regra) => (
          <article key={regra.id} className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div>
              <p className="text-sm font-semibold text-foreground">{regra.origem.canal}: {regra.origem.nome}</p>
              <label className="mt-2 block text-xs text-muted-foreground">
                Quantidade de origem
                <input type="number" min="1" value={regra.quantidade_requisito}
                  onChange={(e) => setDados((atual) => ({ ...atual, regras: atual.regras.map((r) => r.id === regra.id ? { ...r, quantidade_requisito: Number(e.target.value) } : r) }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" />
              </label>
            </div>
            <div className="text-center text-sm font-semibold text-primary">libera</div>
            <div>
              <p className="text-sm font-semibold text-foreground">{regra.destino.canal}: {regra.destino.nome}</p>
              <label className="mt-2 block text-xs text-muted-foreground">
                Quantidade liberada
                <input type="number" min="1" value={regra.quantidade_liberada}
                  onChange={(e) => setDados((atual) => ({ ...atual, regras: atual.regras.map((r) => r.id === regra.id ? { ...r, quantidade_liberada: Number(e.target.value) } : r) }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={regra.ativo} onChange={(e) => setDados((atual) => ({ ...atual, regras: atual.regras.map((r) => r.id === regra.id ? { ...r, ativo: e.target.checked } : r) }))} />
                Regra ativa
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={regra.ciclica} onChange={(e) => setDados((atual) => ({ ...atual, regras: atual.regras.map((r) => r.id === regra.id ? { ...r, ciclica: e.target.checked } : r) }))} />
                Ciclo reinicia
              </label>
              <button type="button" onClick={() => void salvarRegra(regra)} disabled={salvando === regra.id}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {salvando === regra.id ? "Salvando..." : "Salvar regra"}
              </button>
            </div>
          </article>
        ))}
        {!carregando && dados.regras.length === 0 && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma regra encontrada. Aplique as migrations da Fase 9.</p>}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">Bloqueios ativos</h3>
          <p className="text-xs text-muted-foreground">O bloqueio impede novas habilitações até a data final ou até uma decisão favorável de contestação.</p>
        </div>
        {dados.bloqueios.map((bloqueio) => (
          <article key={bloqueio.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold text-foreground">{bloqueio.origem}</p>
              <time className="text-xs text-muted-foreground">Até {new Date(bloqueio.fim).toLocaleString("pt-BR")}</time>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{bloqueio.motivo}</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">Validador: {bloqueio.validador_id}</p>
          </article>
        ))}
        {!carregando && dados.bloqueios.length === 0 && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhum bloqueio ativo.</p>}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">Contestações abertas</h3>
          <p className="text-xs text-muted-foreground">Somente Admin pode decidir. Aceita levanta o bloqueio; negada mantém o bloqueio.</p>
        </div>
        {dados.contestacoes.map((contestacao) => (
          <article key={contestacao.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-foreground">{contestacao.texto}</p>
            <p className="break-all text-xs text-muted-foreground">Validador: {contestacao.validador_id} · Bloqueio: {contestacao.bloqueio_id}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={salvando === contestacao.id} onClick={() => void decidir(contestacao.id, "aceita")}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                Aceitar e levantar
              </button>
              <button type="button" disabled={salvando === contestacao.id} onClick={() => void decidir(contestacao.id, "negada")}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-50">
                Negar e manter
              </button>
            </div>
          </article>
        ))}
        {!carregando && dados.contestacoes.length === 0 && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhuma contestação aberta.</p>}
      </section>
    </section>
  );
}
