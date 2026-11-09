import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Aba = "configuracoes" | "categorias" | "auditoria" | "financeiro" | "suporte";
type Configuracao = { chave: string; valor: string; descricao: string | null; atualizado_em: string };
type Categoria = { id: string; nome: string; ativa: boolean };
type RegistroAuditoria = {
  id: number;
  usuario_id: string | null;
  acao: string;
  entidade: string;
  dados: unknown;
  criado_em: string;
};
type SaquePendente = {
  id: string;
  carteira_id: string;
  valor: number | string;
  status: "solicitado" | "pago" | "rejeitado";
  solicitado_em: string;
};

const abas: { id: Aba; titulo: string }[] = [
  { id: "configuracoes", titulo: "Configurações" },
  { id: "categorias", titulo: "Categorias" },
  { id: "auditoria", titulo: "Auditoria" },
  { id: "financeiro", titulo: "Financeiro" },
  { id: "suporte", titulo: "Suporte" },
];

const padroes: Record<string, { rotulo: string; tipo: "numero" | "booleano" }> = {
  comissao_percentual: { rotulo: "Comissão (%)", tipo: "numero" },
  saque_minimo: { rotulo: "Saque mínimo", tipo: "numero" },
  pendente_horas_novos: { rotulo: "Pendência para novos usuários (horas)", tipo: "numero" },
  pacote_validacao_minimo: { rotulo: "Pacote mínimo de validações", tipo: "numero" },
  prazo_habilitacao_horas: { rotulo: "Prazo de habilitação (horas)", tipo: "numero" },
  contestacao_horas: { rotulo: "Prazo para contestação (horas)", tipo: "numero" },
  bloqueio_horas: { rotulo: "Bloqueio (horas)", tipo: "numero" },
  minimo_diario_instagram: { rotulo: "Mínimo diário do Instagram", tipo: "numero" },
  bloqueio_por_minimo_ativo: { rotulo: "Bloqueio por mínimo ativo", tipo: "booleano" },
  liberacao_ciclica: { rotulo: "Liberação cíclica", tipo: "booleano" },
  valor_avaliacao_interna: { rotulo: "Valor da avaliação interna", tipo: "numero" },
};

export const Route = createFileRoute("/admin/")({
  component: PainelAdmin,
});

function PainelAdmin() {
  const [aba, setAba] = useState<Aba>("configuracoes");
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [saques, setSaques] = useState<SaquePendente[]>([]);
  const [carregandoFinanceiro, setCarregandoFinanceiro] = useState(false);
  const [erroFinanceiro, setErroFinanceiro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const [configs, cats, logs] = await Promise.all([
      supabase.from("configuracoes").select("chave, valor, descricao, atualizado_em").order("chave"),
      supabase.from("categorias").select("id, nome, ativa").order("nome"),
      supabase.from("auditoria").select("id, usuario_id, acao, entidade, dados, criado_em").order("criado_em", { ascending: false }).limit(100),
    ]);
    const falha = configs.error ?? cats.error ?? logs.error;
    if (falha) {
      setErro("Não foi possível carregar todos os dados. Verifique sua sessão e as permissões de administrador.");
    } else {
      setConfiguracoes(configs.data ?? []);
      setCategorias(cats.data ?? []);
      setAuditoria(logs.data ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarSaques = useCallback(async () => {
    setCarregandoFinanceiro(true);
    setErroFinanceiro("");
    const { data, error: saqueError } = await (supabase as any)
      .from("saques")
      .select("id,carteira_id,valor,status,solicitado_em")
      .eq("status", "solicitado")
      .order("solicitado_em", { ascending: true });
    if (saqueError) {
      setErroFinanceiro("O módulo financeiro ainda não está disponível. Confirme se a migration da Fase 4 foi aplicada no Supabase.");
      setSaques([]);
    } else {
      setSaques((data ?? []) as SaquePendente[]);
    }
    setCarregandoFinanceiro(false);
  }, []);

  useEffect(() => {
    if (aba === "financeiro") void carregarSaques();
  }, [aba, carregarSaques]);

  async function marcarSaquePago(id: string) {
    setSalvando(id);
    setErroFinanceiro("");
    const { error: pagamentoError } = await (supabase as any).rpc("marcar_saque_pago", { p_saque_id: id });
    setSalvando(null);
    if (pagamentoError) {
      setErroFinanceiro(pagamentoError.message || "Não foi possível atualizar o saque.");
    } else {
      await carregarSaques();
    }
  }

  async function salvarConfiguracao(item: Configuracao, valor: string) {
    setSalvando(item.chave);
    setMensagem("");
    setErro("");
    const { error: updateError } = await supabase
      .from("configuracoes")
      .update({ valor })
      .eq("chave", item.chave);
    if (updateError) {
      setErro(`Não foi possível salvar ${item.chave}. ${updateError.message}`);
    } else {
      setConfiguracoes((atuais) => atuais.map((config) => config.chave === item.chave ? { ...config, valor } : config));
      setMensagem("Configuração salva.");
    }
    setSalvando(null);
  }

  async function alternarCategoria(item: Categoria) {
    setSalvando(item.id);
    setMensagem("");
    setErro("");
    const { error: updateError } = await supabase
      .from("categorias")
      .update({ ativa: !item.ativa })
      .eq("id", item.id);
    if (updateError) {
      setErro(`Não foi possível atualizar a categoria. ${updateError.message}`);
    } else {
      setCategorias((atuais) => atuais.map((categoria) => categoria.id === item.id ? { ...categoria, ativa: !item.ativa } : categoria));
      setMensagem("Categoria atualizada.");
    }
    setSalvando(null);
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie parâmetros, categorias e consulte as atividades do sistema.</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
          {carregando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </header>

      <nav aria-label="Módulos administrativos" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {abas.map((item) => (
          <button key={item.id} type="button" onClick={() => setAba(item.id)} aria-current={aba === item.id ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${aba === item.id ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-accent"}`}>
            {item.titulo}
          </button>
        ))}
      </nav>

      {erro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
      {mensagem && <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">{mensagem}</p>}
      {carregando && <p role="status" className="text-sm text-muted-foreground">Carregando dados administrativos...</p>}

      {aba === "configuracoes" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Configurações do sistema</h2>
            <p className="text-sm text-muted-foreground">As alterações são gravadas no Supabase e protegidas pela política de administrador.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {configuracoes.map((item) => {
              const definicao = padroes[item.chave];
              const booleano = definicao?.tipo === "booleano" || item.valor === "true" || item.valor === "false";
              return (
                <article key={item.chave} className="rounded-lg border border-border bg-card p-4">
                  <label htmlFor={`config-${item.chave}`} className="mb-2 block text-sm font-semibold text-foreground">{definicao?.rotulo ?? item.chave}</label>
                  {item.descricao && <p className="mb-2 text-xs text-muted-foreground">{item.descricao}</p>}
                  {booleano ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{item.valor === "true" ? "Ativado" : "Desativado"}</span>
                      <button id={`config-${item.chave}`} type="button" role="switch" aria-checked={item.valor === "true"}
                        disabled={salvando === item.chave}
                        onClick={() => void salvarConfiguracao(item, item.valor === "true" ? "false" : "true")}
                        className={`relative h-6 w-11 rounded-full transition-colors ${item.valor === "true" ? "bg-primary" : "bg-muted"} disabled:opacity-50`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${item.valor === "true" ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  ) : (
                    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const campo = form.elements.namedItem("valor"); if (campo instanceof HTMLInputElement && campo.value.trim() !== "") void salvarConfiguracao(item, campo.value.trim()); }}>
                      <input id={`config-${item.chave}`} name="valor" type="number" step={item.chave === "valor_avaliacao_interna" ? "0.01" : "1"} min="0" defaultValue={item.valor}
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
                      <button type="submit" disabled={salvando === item.chave} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        {salvando === item.chave ? "Salvando..." : "Salvar"}
                      </button>
                    </form>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">Chave: {item.chave}</p>
                </article>
              );
            })}
          </div>
          {!carregando && configuracoes.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhuma configuração encontrada.</p>}
        </section>
      )}

      {aba === "categorias" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Categorias</h2>
            <p className="text-sm text-muted-foreground">Ative ou desative categorias sem apagar registros existentes.</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {categorias.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{item.ativa ? "Ativa" : "Inativa"}</p>
                </div>
                <button type="button" onClick={() => void alternarCategoria(item)} disabled={salvando === item.id}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                  {salvando === item.id ? "Salvando..." : item.ativa ? "Desativar" : "Ativar"}
                </button>
              </div>
            ))}
            {!carregando && categorias.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>}
          </div>
        </section>
      )}

      {aba === "auditoria" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Auditoria</h2>
            <p className="text-sm text-muted-foreground">Últimos 100 registros disponíveis. Os eventos são gerados pelos triggers do banco.</p>
          </div>
          <div className="space-y-2">
            {auditoria.map((registro) => (
              <article key={registro.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-foreground">{registro.acao} · {registro.entidade}</p>
                  <time className="text-xs text-muted-foreground" dateTime={registro.criado_em}>{new Date(registro.criado_em).toLocaleString("pt-BR")}</time>
                </div>
                <p className="mt-1 break-all text-xs text-muted-foreground">Usuário: {registro.usuario_id ?? "Sistema"}</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs text-foreground">{JSON.stringify(registro.dados, null, 2)}</pre>
              </article>
            ))}
            {!carregando && auditoria.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhum evento de auditoria registrado até o momento.</p>}
          </div>
        </section>
      )}

      {aba === "financeiro" && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Saques solicitados</h2>
              <p className="text-sm text-muted-foreground">A baixa é simulada e exclusiva do Admin. Nenhuma transferência Pix é realizada.</p>
            </div>
            <button type="button" onClick={() => void carregarSaques()} disabled={carregandoFinanceiro} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              {carregandoFinanceiro ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
          {erroFinanceiro && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erroFinanceiro}</p>}
          {carregandoFinanceiro ? <p role="status" className="text-sm text-muted-foreground">Carregando solicitações...</p> : saques.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Nenhum saque aguardando revisão.</p>
          ) : saques.map((saque) => (
            <article key={saque.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="font-semibold text-foreground">{Number(saque.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                <p className="text-xs text-muted-foreground">Solicitado em {new Date(saque.solicitado_em).toLocaleString("pt-BR")}</p>
                <p className="break-all text-xs text-muted-foreground">Carteira: {saque.carteira_id}</p>
              </div>
              <button type="button" disabled={salvando === saque.id} onClick={() => void marcarSaquePago(saque.id)} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {salvando === saque.id ? "Registrando..." : "Marcar como pago (mock)"}
              </button>
            </article>
          ))}
        </section>
      )}

      {aba === "suporte" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Suporte</h2>
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">Central de atendimento</h3>
            <p className="mt-2 text-sm text-muted-foreground">A área administrativa está preparada para receber o módulo de chamados. O banco atual ainda não possui uma tabela de solicitações, histórico de mensagens ou estados de atendimento; por isso, nenhum chamado fictício ou formulário sem persistência será apresentado.</p>
            <p className="mt-3 text-sm text-muted-foreground">Próxima etapa necessária: definir o fluxo de abertura, atribuição, prioridade e encerramento dos chamados e então criar a estrutura correspondente com RLS e auditoria.</p>
          </div>
        </section>
      )}
    </section>
  );
}
