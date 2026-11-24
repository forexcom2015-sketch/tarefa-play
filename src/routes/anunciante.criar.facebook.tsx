import { createFileRoute } from "@tanstack/react-router";
import { CriarTarefaRede } from "@/components/CriarTarefaRede";
import { metadadosPagina } from "@/lib/seo";

export const Route = createFileRoute("/anunciante/criar/facebook")({
  ssr: false,
  head: () => metadadosPagina("Tarefa no Facebook", "Crie uma tarefa de comentário no Facebook com prévia da publicação."),
  component: () => <CriarTarefaRede rede="facebook" />,
});
