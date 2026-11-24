import { createFileRoute } from "@tanstack/react-router";
import { CriarTarefaRede } from "@/components/CriarTarefaRede";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/anunciante/criar/youtube")({
  ssr: false,
  head: () => metadadosPagina("Tarefa no YouTube", "Crie uma tarefa de comentário no YouTube com prévia da publicação."),
  component: () => <CriarTarefaRede rede="youtube" />,
});
