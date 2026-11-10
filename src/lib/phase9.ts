export type Phase9RpcResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export type Phase9RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<Phase9RpcResult<unknown>>;
};

export type LiberacaoStatus = {
  canal: string;
  tarefas_concluidas: number;
  creditos_disponiveis: number;
  proxima_liberacao_em: string;
  mensagem: string;
};

export type BloqueioStatus = {
  bloqueio?: {
    id: string;
    motivo: string;
    inicio: string;
    fim: string;
    origem: string;
    status: string;
    contestado: boolean;
  };
  contestacao?: {
    id: string;
    texto: string;
    status: string;
    criado_em: string;
  } | null;
};

export function getPhase9DeviceId(): string {
  const chave = "tarefa-play:device-id";
  const existente = window.localStorage.getItem(chave);
  if (existente && existente.length >= 8) return existente;
  const novo = crypto.randomUUID();
  window.localStorage.setItem(chave, novo);
  return novo;
}

export function calcularCreditos(
  instagramValidadas: number,
  siteValidadas: number,
  youtubeValidadas: number,
): { site: number; youtube: number } {
  return {
    site: Math.max(Math.floor(instagramValidadas / 10) * 5 - siteValidadas, 0),
    youtube: Math.max(Math.floor(siteValidadas / 5) * 2 - youtubeValidadas, 0),
  };
}

export function mensagemProgresso(
  canal: "site" | "youtube",
  instagramValidadas: number,
  siteValidadas: number,
): string {
  const creditos = calcularCreditos(instagramValidadas, siteValidadas, 0);
  if (canal === "site") {
    return creditos.site > 0
      ? `Você tem ${creditos.site} visitas a sites liberadas.`
      : `Faça mais ${Math.max(10 - instagramValidadas, 0)} tarefas de Instagram para liberar 5 visitas a sites.`;
  }
  return creditos.youtube > 0
    ? `Você tem ${creditos.youtube} tarefas de YouTube liberadas.`
    : `Faça mais ${Math.max(5 - siteValidadas, 0)} visitas a sites para liberar 2 tarefas de YouTube.`;
}
