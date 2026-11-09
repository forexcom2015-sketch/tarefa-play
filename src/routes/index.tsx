import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AreaLayout";
import { supabase } from "@/integrations/supabase/client";
import { areaDoPapel, obterPapel } from "@/lib/papel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tarefa-Play — Seu produto avaliado por pessoas reais" },
      {
        name: "description",
        content:
          "Receba opiniões independentes sobre produto, preço e divulgação. O Tarefa-Play aproxima anunciantes e pessoas reais para avaliações mais honestas.",
      },
      { property: "og:title", content: "Tarefa-Play — Seu produto avaliado por pessoas reais" },
      {
        property: "og:description",
        content: "Valide produtos com opiniões independentes de pessoas reais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [painelHref, setPainelHref] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const atualizarDestino = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (ativo) setPainelHref(null);
        return;
      }

      const papel = await obterPapel();
      if (ativo) setPainelHref(papel ? areaDoPapel[papel] : "/entrar");
    };

    void atualizarDestino();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void atualizarDestino();
    });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const linkPainel = painelHref ?? "/entrar";
  const textoAcesso = painelHref ? "Ir para meu painel" : "Entrar";

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Tarefa-Play — início" className="shrink-0">
            <Logo />
          </Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#como-funciona" className="transition-colors hover:text-foreground">Como funciona</a>
            <a href="#validadores" className="transition-colors hover:text-foreground">Para Validadores</a>
            <a href="#anunciantes" className="transition-colors hover:text-foreground">Para Anunciantes</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={linkPainel as "/entrar" | "/admin" | "/validador" | "/anunciante"}>{textoAcesso}</Link>
            </Button>
            {!painelHref && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/cadastro">Criar conta</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate border-b border-border/60">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.14),transparent_55%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                <Users className="h-3.5 w-3.5" />
                Opiniões reais. Decisões melhores.
              </div>
              <h1 className="text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Seu produto avaliado por <span className="text-primary">pessoas reais.</span> Sem filtro.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Antes de investir mais na divulgação, descubra o que as pessoas pensam sobre seu produto,
                seu preço e a forma como ele é apresentado.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12">
                  <Link to="/cadastro" search={{ perfil: "validador" }}>
                    Quero validar e ganhar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12">
                  <Link to="/cadastro" search={{ perfil: "anunciante" }}>
                    Quero validar meu produto
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Os ganhos variam e não são garantidos.
              </p>
            </div>

            <div className="mx-auto w-full max-w-lg">
              <div className="rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-primary/10 sm:p-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exemplo ilustrativo</p>
                    <h2 className="mt-1 font-bold">Resumo de avaliações</h2>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary"><ClipboardList className="h-6 w-6" /></div>
                </div>
                <div className="py-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={i === 4 ? "h-5 w-5 fill-amber-500/30" : "h-5 w-5 fill-current"} />)}
                      </div>
                      <p className="mt-2 text-4xl font-black tracking-tight">4,2<span className="ml-1 text-base font-semibold text-muted-foreground">/ 5</span></p>
                      <p className="text-xs text-muted-foreground">Nota média de exemplo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary">82%</p>
                      <p className="text-xs text-muted-foreground">aprovação ilustrativa</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 rounded-2xl bg-secondary/70 p-4">
                  {[
                    { label: "Produto", value: 88 },
                    { label: "Preço", value: 74 },
                    { label: "Divulgação", value: 82 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">Números fictícios para demonstrar como os resultados podem ser apresentados.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">O que é o Tarefa-Play</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Uma opinião sincera vale mais que uma suposição.</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              O Tarefa-Play conecta quem oferece produtos a pessoas que podem avaliá-los com independência.
              O Validador analisa, comenta o que foi bom ou ruim e decide livremente se curte, compartilha
              ou marca alguém — sem obrigação de aprovar.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, title: "Pessoas independentes", text: "Cada pessoa forma sua própria opinião, sem roteiro para elogiar." },
              { icon: MessageCircle, title: "Feedback com contexto", text: "Comentários ajudam a entender o que agradou e o que precisa melhorar." },
              { icon: ShieldCheck, title: "Mais clareza para decidir", text: "Avaliações organizadas mostram percepções sobre produto, preço e divulgação." },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary"><item.icon className="h-5 w-5" /></div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-secondary/60 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Como funciona</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Três passos para transformar opinião em informação.</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { number: "01", title: "O Anunciante publica", text: "Apresenta o produto, informa o preço e compartilha a divulgação que deseja avaliar." },
                { number: "02", title: "O Validador avalia", text: "Analisa produto, preço e divulgação e responde, com liberdade, se compraria ou não." },
                { number: "03", title: "O Anunciante aprende", text: "Recebe uma nota, percentual de aprovação e os motivos apresentados nas avaliações." },
              ].map((item) => (
                <article key={item.number} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="text-sm font-black tracking-widest text-primary">{item.number}</span>
                  <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Duas etapas</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Da validação à experiência real.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-primary/30 bg-primary/5 p-7">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Etapa 1</span>
              <h3 className="mt-5 text-2xl font-extrabold">Validação privada</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Uma publicação pode receber um ciclo de até 100 avaliações privadas para reunir percepções sobre o produto, o preço e a divulgação.</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-7">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">Etapa 2</span>
              <h3 className="mt-5 text-2xl font-extrabold">Tarefas reais</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Em uma etapa posterior, poderão existir tarefas relacionadas a canais e ações específicas, conforme as regras e a disponibilidade da plataforma.</p>
            </article>
          </div>
        </section>

        <section className="bg-secondary/60 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
            <article id="validadores" className="scroll-mt-24 rounded-3xl border border-border bg-card p-7 sm:p-9">
              <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary"><Users className="h-6 w-6" /></div>
              <h2 className="mt-5 text-2xl font-extrabold">Para Validadores</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Compartilhe sua percepção de consumidor, avalie com honestidade e acompanhe as oportunidades disponíveis para seu perfil.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Opinião livre e independente", "Avaliações sobre produto, preço e divulgação", "Acompanhamento das atividades no seu painel"].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}
              </ul>
              <Button asChild className="mt-8">
                <Link to="/cadastro" search={{ perfil: "validador" }}>Quero ser Validador <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </article>
            <article id="anunciantes" className="scroll-mt-24 rounded-3xl border border-border bg-card p-7 sm:p-9">
              <div className="inline-flex rounded-xl bg-primary/10 p-3 text-primary"><ClipboardList className="h-6 w-6" /></div>
              <h2 className="mt-5 text-2xl font-extrabold">Para Anunciantes</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Entenda como seu produto é percebido antes de tomar decisões sobre preço, apresentação e divulgação.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Feedback organizado por critérios", "Percepção de pessoas reais", "Informações para orientar melhorias"].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}
              </ul>
              <Button asChild variant="outline" className="mt-8">
                <Link to="/cadastro" search={{ perfil: "anunciante" }}>Quero anunciar um produto <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-7 sm:p-10">
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Confiança no processo</p>
                <h2 className="mt-3 text-3xl font-extrabold">Feedback que não depende de elogio.</h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">A proposta é preservar a independência das opiniões e dar transparência ao processo de avaliação.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Avaliações independentes",
                  "O anunciante não apaga a nota recebida",
                  "Contas com e-mail confirmado",
                  "Plataforma destinada a maiores de 18 anos",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl bg-secondary/70 p-4 text-sm font-medium">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/60 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Dúvidas frequentes</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Antes de começar</h2>
            </div>
            <div className="mt-8 space-y-3">
              {[
                { q: "Como funciona a avaliação?", a: "O Validador recebe uma publicação e avalia de forma independente o produto, o preço e a divulgação. A opinião pode ser positiva ou negativa." },
                { q: "Preciso elogiar ou compartilhar o produto?", a: "Não. A avaliação deve refletir sua opinião. Curtir, compartilhar ou marcar amigos é uma decisão livre, não uma obrigação." },
                { q: "Como e quando o saque é feito?", a: "O valor mínimo previsto para solicitação é de R$ 100, com pagamento via Pix após a habilitação do fluxo financeiro e a conferência aplicável. O saldo e os ganhos não são garantidos." },
                { q: "O Tarefa-Play garante ganhos ao Validador?", a: "Não. A disponibilidade de tarefas e os ganhos variam e não são garantidos. Consulte sempre as condições apresentadas na plataforma." },
                { q: "Quem pode criar uma conta?", a: "A plataforma é destinada a pessoas maiores de 18 anos. O cadastro utiliza e-mail e exige confirmação para acesso." },
                { q: "O Anunciante pode remover uma avaliação negativa?", a: "A proposta do processo é preservar a independência dos resultados. O Anunciante não pode apagar a nota recebida." },
              ].map((item) => (
                <details key={item.q} className="group rounded-xl border border-border bg-card px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <div className="rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sua próxima decisão pode começar com uma opinião real.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80">Participe do Tarefa-Play como Validador ou apresente seu produto para receber avaliações.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="secondary" size="lg">
                <Link to="/cadastro" search={{ perfil: "validador" }}>Quero validar e ganhar</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/cadastro" search={{ perfil: "anunciante" }}>Quero validar meu produto</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-primary-foreground/75">Os ganhos variam e não são garantidos.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Logo />
            <p className="mt-2 text-xs text-muted-foreground">Opiniões independentes para decisões melhores.</p>
          </div>
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <a href="#documentos-legais" className="hover:text-foreground">Termos</a>
            <a href="#documentos-legais" className="hover:text-foreground">Privacidade</a>
            <a href="#contato" className="hover:text-foreground">Contato</a>
          </nav>
          <div className="text-xs text-muted-foreground md:text-right"><p id="documentos-legais">Termos e Política de Privacidade serão publicados antes da abertura pública.</p><p id="contato" className="mt-1">Canal de contato em preparação.</p><p className="mt-2">© {new Date().getFullYear()} Tarefa-Play</p></div>
        </div>
      </footer>
    </div>
  );
}
