/**
 * lib/proventos.js
 *
 * Núcleo de cálculo de proventos — normaliza a resposta de dividendos/rendimentos
 * da brapi.dev, cruza com a posição atual da carteira e monta o resumo consolidado.
 * Livre de UI e de I/O (fetch fica em CarteiraContext.jsx): recebe dados já buscados,
 * devolve dados puros. Mesmo espírito de calculos.js.
 *
 * ATENÇÃO: a brapi.dev não documenta um schema fechado para os endpoints de
 * dividendos. Os nomes de campo abaixo (paymentDate, rate, lastDatePrior, etc.)
 * são o melhor palpite com base no formato mais comum observado na v2 da API —
 * ainda não confirmados contra uma resposta real com dados (a busca em produção
 * até agora só retornou erro de HTTP para todos os ativos testados, então o
 * shape do corpo de sucesso continua sem validação — ver CLAUDE.md).
 */

export const TIPO_PROVENTO = {
  DIVIDENDO: "DIVIDENDO",
  JCP: "JCP",
  BONIFICACAO: "BONIFICACAO",
  SUBSCRICAO: "SUBSCRICAO",
  RENDIMENTO_FII: "RENDIMENTO_FII",
  OUTRO: "OUTRO",
};

// Proventos não mudam intraday como cotação — TTL bem mais longo que os
// 15 min usados para cotações evita bater na API a cada abertura da tela.
export const TTL_PROVENTOS_MS = 12 * 60 * 60 * 1000;

function tipoPorLabelAcao(dividendType, label) {
  const chave = `${dividendType || ""} ${label || ""}`.toUpperCase();
  if (chave.includes("JCP") || chave.includes("JUROS") || chave.includes("INTEREST")) return TIPO_PROVENTO.JCP;
  if (chave.includes("DIVID")) return TIPO_PROVENTO.DIVIDENDO;
  return TIPO_PROVENTO.OUTRO;
}

function calcularStatus(dataPagamento) {
  if (!dataPagamento) return "PREVISTO";
  const tempo = new Date(dataPagamento).getTime();
  if (Number.isNaN(tempo)) return "PREVISTO";
  return tempo <= Date.now() ? "PAGO" : "PREVISTO";
}

/**
 * Normaliza um item bruto de "cashDividends"/"stockDividends"/"subscriptions"
 * (endpoint /stocks/dividends) para o formato interno Provento.
 * @param {string} codigo
 * @param {Object} raw
 * @param {string} [tipoForcado] - usado quando o array de origem já define o
 *   tipo (stockDividends -> BONIFICACAO, subscriptions -> SUBSCRICAO), em vez
 *   de tentar inferir de dividendType/label.
 */
export function normalizarProventoAcao(codigo, raw, tipoForcado) {
  const dataPagamento = raw.paymentDate ?? raw.payDate ?? null;
  const dataCom = raw.lastDatePrior ?? raw.dateCom ?? raw.recordDate ?? null;
  const valorPorAtivo = Number(raw.rate ?? raw.value ?? raw.factor ?? raw.price ?? 0);
  return {
    codigo,
    tipo: tipoForcado ?? tipoPorLabelAcao(raw.dividendType ?? raw.type, raw.label),
    dataCom,
    dataPagamento,
    valorPorAtivo,
    status: calcularStatus(dataPagamento),
  };
}

/**
 * Normaliza um item bruto de rendimento (endpoint /fii/dividends).
 */
export function normalizarProventoFii(codigo, raw) {
  const dataPagamento = raw.paymentDate ?? raw.payDate ?? null;
  const dataCom = raw.lastDatePrior ?? raw.dateCom ?? raw.recordDate ?? null;
  const valorPorAtivo = Number(raw.rate ?? raw.value ?? 0);
  return {
    codigo,
    tipo: TIPO_PROVENTO.RENDIMENTO_FII,
    dataCom,
    dataPagamento,
    valorPorAtivo,
    status: calcularStatus(dataPagamento),
  };
}

/**
 * Extrai e normaliza todos os proventos de um item de resultado do endpoint
 * /stocks/dividends (que agrupa cashDividends, stockDividends e subscriptions
 * no mesmo item por símbolo).
 */
export function mapearRespostaAcao(codigo, item) {
  return [
    ...(item.cashDividends ?? []).map((r) => normalizarProventoAcao(codigo, r)),
    ...(item.stockDividends ?? []).map((r) => normalizarProventoAcao(codigo, r, TIPO_PROVENTO.BONIFICACAO)),
    ...(item.subscriptions ?? []).map((r) => normalizarProventoAcao(codigo, r, TIPO_PROVENTO.SUBSCRICAO)),
  ];
}

/**
 * Extrai e normaliza os rendimentos de um item de resultado do endpoint
 * /fii/dividends.
 */
export function mapearRespostaFii(codigo, item) {
  const brutos = item.cashDividends ?? item.dividends ?? [];
  return brutos.map((r) => normalizarProventoFii(codigo, r));
}

/**
 * Só considera proventos já pagos a partir do início do ano corrente —
 * histórico completo não é objetivo desta tela. Eventos futuros (PREVISTO)
 * nunca são filtrados por ano, mesmo que a data prevista caia adiante.
 */
export function dentroDoEscopoHistorico(provento, anoReferencia = new Date().getFullYear()) {
  if (provento.status === "PREVISTO") return true;
  if (!provento.dataPagamento) return false;
  const ano = new Date(provento.dataPagamento).getFullYear();
  return !Number.isNaN(ano) && ano >= anoReferencia;
}

/**
 * Cruza um Provento com a quantidade ATUAL do ativo na carteira.
 *
 * LIMITAÇÃO CONHECIDA: o sistema não mantém histórico de posição por data
 * (o campo `quantidade` de um ativo é editável livremente em Posição Atual
 * sem gerar nenhum registro em `historico`). Não há como saber quantas
 * unidades o usuário tinha na data-com de um evento passado. Por isso todo
 * cálculo usa a quantidade atual, inclusive para proventos já pagos, e o
 * resultado é sinalizado explicitamente como aproximado via
 * `quantidadeAproximada: true` — a UI deve deixar isso visível ao usuário.
 */
export function paraProventoPosicao(provento, quantidade) {
  const qtd = quantidade || 0;
  return {
    ...provento,
    quantidade: qtd,
    valorEstimado: provento.valorPorAtivo * qtd,
    quantidadeAproximada: true,
  };
}

/**
 * Resumo consolidado para os cards da tela de Proventos.
 */
export function montarResumo(proventosPosicao) {
  const previstos = proventosPosicao.filter((p) => p.status === "PREVISTO");
  const pagos = proventosPosicao.filter((p) => p.status === "PAGO");

  const somaValorEstimado = (lista) => lista.reduce((acc, p) => acc + p.valorEstimado, 0);
  const somaPorTipo = (tipo) =>
    proventosPosicao.filter((p) => p.tipo === tipo).reduce((acc, p) => acc + p.valorEstimado, 0);

  const proximo = previstos
    .filter((p) => p.dataPagamento)
    .sort((a, b) => new Date(a.dataPagamento) - new Date(b.dataPagamento))[0];

  return {
    totalPrevisto: somaValorEstimado(previstos),
    totalRecebido: somaValorEstimado(pagos),
    totalDividendos: somaPorTipo(TIPO_PROVENTO.DIVIDENDO),
    totalJCP: somaPorTipo(TIPO_PROVENTO.JCP),
    totalRendimentosFII: somaPorTipo(TIPO_PROVENTO.RENDIMENTO_FII),
    proximoPagamento: proximo
      ? { codigo: proximo.codigo, data: proximo.dataPagamento, valorEstimado: proximo.valorEstimado }
      : null,
  };
}
