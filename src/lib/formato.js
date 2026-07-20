/**
 * lib/formato.js
 * Funções de formatação usadas em toda a UI — centralizadas para garantir
 * consistência (mesmo separador decimal, mesmo número de casas, etc).
 */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
});

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return formatadorMoeda.format(valor);
}

export function formatarPercentual(valor, casasDecimais = 2) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${(valor * 100).toFixed(casasDecimais)}%`;
}

export function formatarPercentualComSinal(valor, casasDecimais = 2) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  const pct = valor * 100;
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(casasDecimais)}%`;
}

export function formatarQuantidade(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  if (valor === 0) return "0";
  const abs = Math.abs(valor);
  const decimais = abs >= 100 ? 2 : abs >= 1 ? 4 : 8;
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimais,
  });
}

export function formatarNumero(valor, casasDecimais) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  if (casasDecimais !== undefined) {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: casasDecimais,
      maximumFractionDigits: casasDecimais,
    });
  }
  return formatadorNumero.format(valor);
}
