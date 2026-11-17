/** Impede que planilhas interpretem um valor fornecido por usuário como fórmula. */
export function celulaCsvSegura(valor: string): string {
  const protegido = /^\s*[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return `"${protegido.replaceAll('"', '""')}"`;
}

export function gerarCsv(cabecalho: string[], linhas: string[][]): string {
  return [cabecalho, ...linhas]
    .map((linha) => linha.map((valor) => celulaCsvSegura(valor)).join(","))
    .join("\r\n");
}
