import { supabase } from "@/integrations/supabase/client";

const bucket = "criativos-publicacoes";
const prefixoPublico = `/storage/v1/object/public/${bucket}/`;

export function caminhoCriativo(valor: string): string {
  if (!valor) return "";
  try {
    const url = new URL(valor);
    const inicio = url.pathname.indexOf(prefixoPublico);
    return inicio >= 0 ? decodeURIComponent(url.pathname.slice(inicio + prefixoPublico.length)) : "";
  } catch {
    return valor.replace(/^\/+/, "");
  }
}

export async function assinarCriativo(valor: string): Promise<string | null> {
  const caminho = caminhoCriativo(valor);
  if (!caminho) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 3600);
  return error ? null : data.signedUrl;
}
