import { createFileRoute } from "@tanstack/react-router";
import { CriarTarefaRede } from "@/components/CriarTarefaRede";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/anunciante/criar/instagram")({
  ssr: false,
  head: () => metadadosPagina("Tarefa no Instagram", "Crie uma tarefa de comentário no Instagram com prévia da publicação."),
  component: () => <CriarTarefaRede rede="instagram" />,
});
