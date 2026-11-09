import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/anunciante/automacao")({
  ssr: false,
  head: () => ({ meta: [{ title: "Configurar automação — Tarefa-Play" }, { name: "robots", content: "noindex" }] }),
  component: ConfigurarAutomacao,
});

function ConfigurarAutomacao() {
  const teste = "@teste_tarefaplay,TP-TESTE-2026";
  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-foreground">Como configurar a automação</h2>
        <p className="mt-1 text-sm text-muted-foreground">O Tarefa-Play gera os pares @/código. Você configura a ferramenta externa para reconhecer o comentário e enviar o código correto por mensagem.</p>
      </header>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-foreground">Vídeo passo a passo</h3>
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted p-6 text-center">
          <div><p className="font-medium text-foreground">Espaço reservado para o vídeo tutorial</p><p className="mt-1 text-xs text-muted-foreground">O vídeo oficial será inserido aqui quando estiver disponível.</p></div>
        </div>
      </article>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-foreground">PDF de configuração</h3>
        <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted p-6 text-center">
          <div><p className="font-medium text-foreground">Espaço reservado para o guia em PDF</p><p className="mt-1 text-xs text-muted-foreground">O material para download será disponibilizado nesta área.</p></div>
        </div>
      </article>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-foreground">Passos para configurar sua ferramenta</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>Crie uma automação na ferramenta de sua preferência para monitorar comentários na publicação real do Instagram.</li>
          <li>Exporte a lista de tokens da tarefa no Tarefa-Play e importe os pares de identificador (@) e código na automação.</li>
          <li>Configure a regra para identificar o @ do autor do comentário e localizar somente o código associado àquele mesmo @.</li>
          <li>Envie o código correspondente por mensagem privada. Não reutilize códigos e não envie o código de outro participante.</li>
          <li>Oriente o Validador a colar o código recebido na tela da tarefa no Tarefa-Play. Cada código expira em até 30 minutos, pode ser usado uma única vez e tem no máximo cinco tentativas.</li>
          <li>Se o código não chegar, o Validador deve abrir um chamado e informar o link público do comentário. Você terá 24 horas para resolver antes do escalonamento ao suporte.</li>
        </ol>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">O Tarefa-Play não acessa sua ferramenta de automação, não envia mensagens no Instagram e não guarda senhas ou credenciais externas. A exportação da lista é feita pelo próprio Anunciante.</p>
      </article>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-semibold text-foreground">Teste de configuração</h3>
        <p className="text-sm text-muted-foreground">Use este par fictício para conferir se sua ferramenta consegue relacionar um identificador a um código. Ele não pertence a uma tarefa real e nunca será aceito na validação de pagamentos.</p>
        <div className="grid gap-2 rounded-lg bg-muted p-4 sm:grid-cols-2">
          <div><span className="text-xs text-muted-foreground">Identificador de teste</span><p className="font-mono font-semibold text-foreground">@teste_tarefaplay</p></div>
          <div><span className="text-xs text-muted-foreground">Código de teste</span><p className="font-mono font-semibold text-foreground">TP-TESTE-2026</p></div>
        </div>
        <Button variant="outline" onClick={() => void navigator.clipboard.writeText(teste)}>Copiar par de teste</Button>
      </article>
    </section>
  );
}
