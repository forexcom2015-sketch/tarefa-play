import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AreaLayout";
import { obterPapel } from "@/lib/papel";

type Categoria = { id: string; nome: string };

const CONTRATO_VERSAO = "1.0";
const CONTRATO_TEXTO =
  "Você atua como profissional independente e utiliza uma plataforma que faz a conexão entre usuários e empresas. Você tem liberdade para organizar seus horários. A plataforma não estabelece vínculo trabalhista. A remuneração, quando aplicável, depende das atividades válidas e das regras publicadas. Este texto é um modelo provisório e deve passar por revisão jurídica antes de ser utilizado como contrato definitivo.";

function validarCnpj(valor: string) {
  const cnpj = valor.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calcular = (base: string, pesos: number[]) => {
    const soma = [...base].reduce((total, digito, i) => total + Number(digito) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = calcular(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const segundo = calcular(cnpj.slice(0, 12) + primeiro, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return primeiro === Number(cnpj[12]) && segundo === Number(cnpj[13]);
}

function validarCpf(valor: string) {
  const cpf = valor.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, peso: number) => {
    let soma = 0;
    for (const numero of base) soma += Number(numero) * peso--;
    const resto = (soma * 10) % 11;
    return (resto === 10 ? 0 : resto) === Number(cpf[base.length]);
  };
  return digito(cpf.slice(0, 9), 10) && digito(cpf.slice(0, 10), 11);
}

export const Route = createFileRoute("/cadastro/completar")({
  head: () => ({ meta: [{ title: "Completar cadastro — Tarefa-Play" }] }),
  component: CompletarCadastro,
});

function CompletarCadastro() {
  const navigate = useNavigate();
  const [papel, setPapel] = useState<"validador" | "anunciante" | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [interesses, setInteresses] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [documento, setDocumento] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<"cpf" | "cnpj">("cpf");
  const [tipoProduto, setTipoProduto] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [tipoChave, setTipoChave] = useState("cpf");
  const [chavePix, setChavePix] = useState("");
  const [titularPix, setTitularPix] = useState("");
  const [instagram, setInstagram] = useState("");
  const [dataPostagem, setDataPostagem] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [maiorDe18, setMaiorDe18] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const db = supabase as any;
  const documentoValido = useMemo(() => tipoDocumento === "cpf" ? validarCpf(documento) : validarCnpj(documento), [documento, tipoDocumento]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [papelAtual, cats, perfil] = await Promise.all([
        obterPapel(),
        supabase.from("categorias").select("id,nome").eq("ativa", true).order("nome"),
        supabase.auth.getUser(),
      ]);
      if (!ativo) return;
      if (papelAtual === "validador" || papelAtual === "anunciante") setPapel(papelAtual);
      if (cats.data) setCategorias(cats.data as Categoria[]);
      if (perfil.data.user?.user_metadata?.nome) setNome(String(perfil.data.user.user_metadata.nome));
    }
    void carregar();
    return () => { ativo = false; };
  }, []);

  function alternarInteresse(id: string) {
    setInteresses((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : atuais.length < 8 ? [...atuais, id] : atuais);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    if (!papel) return setErro("Não foi possível identificar o perfil desta conta.");
    if (!maiorDe18) return setErro("Confirme que você tem 18 anos ou mais.");
    if (!aceite) return setErro("É necessário aceitar o contrato para continuar.");
    if (!nome.trim() || !telefone.trim() || !documento.trim()) return setErro(`Preencha nome, telefone e ${tipoDocumento.toUpperCase()}.`);
    if (!documentoValido) return setErro(tipoDocumento === "cpf" ? "Informe um CPF válido." : "Informe um CNPJ válido.");
    if (papel === "validador" && tipoDocumento !== "cpf") return setErro("O cadastro de Validador exige CPF.");
    if (papel === "validador" && (interesses.length < 3 || interesses.length > 8)) return setErro("Selecione de 3 a 8 interesses.");
    if (papel === "validador" && !consentimento) return setErro("Confirme o consentimento para uso dos interesses no direcionamento de tarefas.");
    if (papel === "validador" && (!chavePix.trim() || !titularPix.trim())) return setErro("Preencha os dados da conta Pix.");
    if (papel === "validador" && (!instagram.trim() || !dataPostagem || !imagem)) return setErro("Informe o Instagram, a data da primeira postagem e envie uma imagem.");
    if (papel === "anunciante" && !tipoProduto.trim()) return setErro("Informe o tipo de produto ou serviço divulgado.");

    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

      const documentoLimpo = documento.replace(/\D/g, "");
      const { error: docError } = await db.from("documentos_usuarios").upsert({
        usuario_id: user.id, tipo_documento: tipoDocumento, documento: documentoLimpo,
      }, { onConflict: "usuario_id" });
      if (docError) throw docError;

      const { error: aceiteError } = await db.from("aceites_contrato").upsert({
        usuario_id: user.id, versao: CONTRATO_VERSAO,
      }, { onConflict: "usuario_id,versao", ignoreDuplicates: true });
      if (aceiteError) throw aceiteError;

      if (papel === "validador") {
        const { error: perfilError } = await db.from("cadastro_validadores").upsert({
          usuario_id: user.id, telefone, maior_de_18: maiorDe18,
          consentimento_lgpd_interesses: consentimento, telefone_verificado: false,
        }, { onConflict: "usuario_id" });
        if (perfilError) throw perfilError;

        const { error: removeError } = await db.from("interesses_validador").delete().eq("usuario_id", user.id);
        if (removeError) throw removeError;
        const { error: interestsError } = await db.from("interesses_validador").insert(
          interesses.map((categoria_id) => ({ usuario_id: user.id, categoria_id })),
        );
        if (interestsError) throw interestsError;

        const { error: pixError } = await db.from("contas_pix").upsert({
          usuario_id: user.id, tipo_chave: tipoChave, chave: chavePix,
          titular_nome: titularPix, titular_cpf: documentoLimpo, aprovado: false,
        }, { onConflict: "usuario_id" });
        if (pixError) throw pixError;

        const extensao = imagem!.name.split(".").pop()?.toLowerCase() || "jpg";
        const caminho = user.id + "/" + crypto.randomUUID() + "." + extensao;
        const { error: uploadError } = await supabase.storage.from("verificacoes-instagram").upload(caminho, imagem!, {
          contentType: imagem!.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        const imagemPath = caminho;
        const { error: socialError } = await db.from("contas_sociais").upsert({
          usuario_id: user.id, canal: "instagram", handle: instagram.replace(/^@/, ""),
          data_primeira_postagem: dataPostagem, imagem_url: imagemPath, status: "pendente",
        }, { onConflict: "usuario_id,canal" });
        if (socialError) throw socialError;

        setSucesso("Cadastro enviado. A verificação automática do telefone ainda não está ativa nesta fase; Pix e Instagram aguardam análise do Admin. As tarefas permanecem bloqueadas até as aprovações.");
      } else {
        const { error: perfilError } = await db.from("cadastro_anunciantes").upsert({
          usuario_id: user.id, nome_empresa: nome, telefone, tipo_produto: tipoProduto, maior_de_18: maiorDe18,
        }, { onConflict: "usuario_id" });
        if (perfilError) throw perfilError;
        setSucesso("Cadastro de Anunciante salvo. Você já pode acessar seu painel.");
      }

      if (codigoIndicacao.trim()) {
        const { error: indicacaoError } = await db.rpc("registrar_indicacao", {
          p_codigo: codigoIndicacao.trim().toUpperCase(),
        });
        if (indicacaoError) throw new Error(`Cadastro salvo, mas o código de indicação não foi aceito: ${indicacaoError.message}`);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar seu cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  if (!papel) {
    return <div className="flex min-h-screen items-center justify-center bg-secondary p-6"><p className="text-sm text-muted-foreground">Carregando seu perfil...</p></div>;
  }

  return (
    <main className="min-h-screen bg-secondary px-4 py-8">
      <form onSubmit={salvar} className="mx-auto w-full max-w-2xl space-y-6 rounded-xl bg-card p-6 shadow-sm sm:p-8">
        <Logo />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Etapa de cadastro</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Complete seu perfil de {papel === "validador" ? "Validador" : "Anunciante"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Seus dados pessoais são privados e ficam visíveis somente para você e para a administração, conforme as permissões da plataforma.</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">1. Dados pessoais</h2>
          <div className="space-y-1"><Label htmlFor="nome">Nome completo / razão social</Label><Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
          <p className="text-xs text-muted-foreground">A validação automática do telefone ainda não está ativa nesta fase. Não informe códigos recebidos por SMS ou WhatsApp neste formulário.</p>
          {papel === "anunciante" && <div className="space-y-1"><Label htmlFor="tipo-documento">Tipo de documento</Label><select id="tipo-documento" value={tipoDocumento} onChange={(e) => { setTipoDocumento(e.target.value as "cpf" | "cnpj"); setDocumento(""); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="cpf">CPF</option><option value="cnpj">CNPJ</option></select></div>}
          <div className="space-y-1"><Label htmlFor="documento">{tipoDocumento.toUpperCase()}</Label><Input id="documento" required inputMode="numeric" maxLength={tipoDocumento === "cpf" ? 14 : 18} value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder={tipoDocumento === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"} /></div>
          {documento && <p className={documentoValido ? "text-xs text-green-700" : "text-xs text-destructive"}>{documentoValido ? `${tipoDocumento.toUpperCase()} válido` : `Confira o ${tipoDocumento.toUpperCase()} informado`}</p>}
          <label className="flex items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={maiorDe18} onChange={(e) => setMaiorDe18(e.target.checked)} className="mt-1" /> Confirmo que tenho 18 anos ou mais.</label>
        </section>

        {papel === "validador" ? (
          <>
            <section className="space-y-3">
              <h2 className="font-semibold text-foreground">2. Interesses nas redes sociais</h2>
              <p className="text-sm text-muted-foreground">O que você mais curte nas redes sociais? Selecione de 3 a 8 categorias.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categorias.map((categoria) => (
                  <button key={categoria.id} type="button" onClick={() => alternarInteresse(categoria.id)} className={`rounded-lg border p-3 text-left text-sm transition-colors ${interesses.includes(categoria.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                    {categoria.nome}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{interesses.length}/8 selecionados (mínimo 3).</p>
              <label className="flex items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} className="mt-1" /> Autorizo o uso dessas preferências exclusivamente para direcionar tarefas compatíveis, conforme a LGPD.</label>
            </section>
            <section className="space-y-3">
              <h2 className="font-semibold text-foreground">3. Conta Pix</h2>
              <div className="space-y-1"><Label htmlFor="tipo-pix">Tipo de chave</Label><select id="tipo-pix" value={tipoChave} onChange={(e) => setTipoChave(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Chave aleatória</option></select></div>
              <div className="space-y-1"><Label htmlFor="chave-pix">Chave Pix</Label><Input id="chave-pix" required value={chavePix} onChange={(e) => setChavePix(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="titular-pix">Nome do titular</Label><Input id="titular-pix" required value={titularPix} onChange={(e) => setTitularPix(e.target.value)} /></div>
              <p className="text-xs text-muted-foreground">O CPF do titular deve ser igual ao CPF cadastrado. A aprovação da conta é feita pela administração; nenhum pagamento real é processado nesta fase.</p>
            </section>
            <section className="space-y-3">
              <h2 className="font-semibold text-foreground">4. Verificação do Instagram</h2>
              <div className="space-y-1"><Label htmlFor="instagram">@ do Instagram</Label><Input id="instagram" required value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuusuario" /></div>
              <div className="space-y-1"><Label htmlFor="data-postagem">Data da primeira postagem</Label><Input id="data-postagem" type="date" required value={dataPostagem} onChange={(e) => setDataPostagem(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="imagem">Imagem da primeira postagem</Label><Input id="imagem" type="file" accept="image/png,image/jpeg,image/webp" required onChange={(e) => setImagem(e.target.files?.[0] ?? null)} /></div>
              <p className="text-xs text-muted-foreground">A imagem será armazenada em área privada e analisada pelo Admin. A conta só poderá ser aprovada se a primeira postagem tiver mais de 6 meses.</p>
            </section>
          </>
        ) : (
          <section className="space-y-3">
            <h2 className="font-semibold text-foreground">2. Dados do anunciante</h2>
            <div className="space-y-1"><Label htmlFor="produto">Tipo de produto ou serviço divulgado</Label><Input id="produto" required value={tipoProduto} onChange={(e) => setTipoProduto(e.target.value)} placeholder="Ex.: moda, alimentação, tecnologia..." /></div>
          </section>
        )}

        <section className="space-y-2 rounded-lg border border-border p-4">
          <h2 className="font-semibold text-foreground">Código de indicação (opcional)</h2>
          <Label htmlFor="codigo-indicacao">Se alguém convidou você, informe o código</Label>
          <Input id="codigo-indicacao" value={codigoIndicacao} onChange={(e) => setCodigoIndicacao(e.target.value.toUpperCase())} maxLength={10} autoCapitalize="characters" placeholder="Ex.: A1B2C3D4E5" />
          <p className="text-xs text-muted-foreground">A indicação é direta, de um único nível. O bônus segue percentual configurável e não é liberado automaticamente ao cadastrar.</p>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-semibold text-foreground">Contrato de prestação de serviços — versão {CONTRATO_VERSAO}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{CONTRATO_TEXTO}</p>
          <p className="text-xs text-amber-700">Texto provisório, sujeito à revisão jurídica antes de ser utilizado como instrumento contratual definitivo.</p>
          <label className="flex items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1" /> Li e aceito o contrato de prestação de serviços acima.</label>
        </section>

        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {sucesso && <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4"><p role="status" className="text-sm text-foreground">{sucesso}</p><Button type="button" variant="outline" onClick={() => navigate({ to: papel === "validador" ? "/validador" : "/anunciante" })}>Ir para meu painel</Button></div>}
        <Button type="submit" className="w-full" disabled={salvando || Boolean(sucesso)}>{salvando ? "Salvando cadastro..." : "Salvar e continuar"}</Button>
      </form>
    </main>
  );
}
