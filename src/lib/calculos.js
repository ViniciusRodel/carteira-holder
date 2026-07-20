/**
 * lib/calculos.js
 *
 * Núcleo de cálculo da Carteira Holder — portado 1:1 da lógica da planilha Excel.
 * Mantém-se livre de qualquer dependência de UI: recebe dados puros, devolve dados puros.
 *
 * Conceitos:
 *  - Ativo: { codigo, classe, nota, precoTeto, cotacao, quantidade }
 *  - Classe: agrupamento (Ações, FIIs, Renda Fixa, ETFs Brasil, ETFs USA, Criptomoedas)
 *  - Nota: peso relativo do ativo DENTRO da sua classe (não precisa somar 100, é só proporção)
 *  - Meta de classe: % objetivo de cada classe na carteira total (deve somar 100%)
 */

/**
 * Valor investido em um ativo = cotação atual x quantidade possuída.
 */
export function valorInvestido(ativo) {
  return (ativo.cotacao || 0) * (ativo.quantidade || 0);
}

/**
 * Valor total investido em todos os ativos.
 */
export function valorTotalInvestido(ativos) {
  return ativos.reduce((acc, a) => acc + valorInvestido(a), 0);
}

/**
 * Valor atualmente investido em uma classe específica.
 */
export function valorInvestidoPorClasse(ativos, classe) {
  return ativos
    .filter((a) => a.classe === classe)
    .reduce((acc, a) => acc + valorInvestido(a), 0);
}

/**
 * % atual de uma classe sobre o total da carteira.
 */
export function percentualAtualClasse(ativos, classe) {
  const total = valorTotalInvestido(ativos);
  if (total === 0) return 0;
  return valorInvestidoPorClasse(ativos, classe) / total;
}

/**
 * % atual de um ativo dentro da SUA classe (não da carteira toda).
 */
export function percentualAtivoNaClasse(ativos, ativo) {
  const totalClasse = valorInvestidoPorClasse(ativos, ativo.classe);
  if (totalClasse === 0) return 0;
  return valorInvestido(ativo) / totalClasse;
}

/**
 * % atual de um ativo sobre o total da carteira.
 */
export function percentualAtivoNaCarteira(ativos, ativo) {
  const total = valorTotalInvestido(ativos);
  if (total === 0) return 0;
  return valorInvestido(ativo) / total;
}

/**
 * % da classe que um ativo representa, baseado na NOTA (meta), não no valor atual.
 * % da classe (meta) = nota do ativo / soma das notas de todos os ativos da mesma classe.
 */
export function percentualMetaAtivoNaClasse(ativos, ativo) {
  const somaNotas = ativos
    .filter((a) => a.classe === ativo.classe)
    .reduce((acc, a) => acc + (a.nota || 0), 0);
  if (somaNotas === 0) return 0;
  return (ativo.nota || 0) / somaNotas;
}

/**
 * % objetivo (meta) de um ativo sobre a carteira total =
 *   % do ativo dentro da classe (meta) x % meta da classe na carteira.
 */
export function percentualMetaAtivoNaCarteira(ativos, ativo, metasClasse) {
  const pctClasse = percentualMetaAtivoNaClasse(ativos, ativo);
  const metaClasse = (metasClasse[ativo.classe] || 0) / 100;
  return pctClasse * metaClasse;
}

/**
 * Soma de todas as metas de classe — deve fechar em 100% (1.0).
 */
export function somaMetasClasse(metasClasse) {
  return Object.values(metasClasse).reduce((acc, v) => acc + v, 0);
}

/**
 * Déficit em R$ de um ativo: quanto falta investir nele para ele atingir
 * sua meta de % na carteira, considerando o valor total ATUAL (antes do aporte).
 * Negativo ou zero significa que o ativo já está na meta ou acima dela.
 */
export function deficitAtivo(ativos, ativo, metasClasse) {
  const total = valorTotalInvestido(ativos);
  const metaValor = percentualMetaAtivoNaCarteira(ativos, ativo, metasClasse) * total;
  const valorAtual = valorInvestido(ativo);
  return Math.max(metaValor - valorAtual, 0);
}

/**
 * Calcula a tabela de rebalanceamento completa: para cada ativo incluído no cálculo,
 * distribui o valor do aporte proporcionalmente ao déficit de cada um.
 *
 * @param {Array} ativos - lista de ativos
 * @param {Object} metasClasse - { "Ações": 30, "FIIs": 29, ... } em pontos percentuais (0-100)
 * @param {number} valorAporte - valor em R$ a ser distribuído
 * @param {Set<string>} codigosExcluidos - códigos de ativos a EXCLUIR do cálculo
 * @returns {Array} linhas com todos os campos calculados, prontos para a tela de Rebalanceamento
 */
export function calcularRebalanceamento(ativos, metasClasse, valorAporte, codigosExcluidos = new Set()) {
  const total = valorTotalInvestido(ativos);

  const linhas = ativos.map((ativo) => {
    const incluido = !codigosExcluidos.has(ativo.codigo);
    const valorInv = valorInvestido(ativo);
    const pctAtual = total > 0 ? valorInv / total : 0;
    const pctMeta = percentualMetaAtivoNaCarteira(ativos, ativo, metasClasse);
    const pctDiferenca = pctAtual - pctMeta;
    const deficit = incluido ? deficitAtivo(ativos, ativo, metasClasse) : 0;

    return {
      ...ativo,
      valorInvestido: valorInv,
      pctAtual,
      pctMeta,
      pctDiferenca,
      incluido,
      deficit,
    };
  });

  const somaDeficits = linhas.reduce((acc, l) => acc + l.deficit, 0);

  return linhas.map((linha) => {
    const valorAportar =
      somaDeficits > 0 ? (valorAporte * linha.deficit) / somaDeficits : 0;
    const qtdComprar =
      linha.cotacao > 0 ? Math.floor(valorAportar / linha.cotacao) : 0;
    const vlrCompra = qtdComprar * linha.cotacao;
    return { ...linha, valorAportar, qtdComprar, vlrCompra };
  });
}

/**
 * Resumo por classe para o Dashboard: valor atual, % atual, % meta, % de atingimento.
 */
export function resumoPorClasse(ativos, metasClasse) {
  const classes = Object.keys(metasClasse);
  const total = valorTotalInvestido(ativos);

  return classes.map((classe) => {
    const valorAtual = valorInvestidoPorClasse(ativos, classe);
    const pctAtual = total > 0 ? valorAtual / total : 0;
    const pctMeta = (metasClasse[classe] || 0) / 100;
    const atingimento = pctMeta > 0 ? pctAtual / pctMeta : 0;

    return {
      classe,
      valorAtual,
      pctAtual,
      pctMeta,
      atingimento,
    };
  });
}

/**
 * Tabela "Meta - Ativos": % da classe e % da carteira (meta) para cada ativo.
 */
export function tabelaMetaAtivos(ativos, metasClasse) {
  return ativos.map((ativo) => ({
    ...ativo,
    pctClasse: percentualMetaAtivoNaClasse(ativos, ativo),
    pctMetaClasse: (metasClasse[ativo.classe] || 0) / 100,
    pctCarteira: percentualMetaAtivoNaCarteira(ativos, ativo, metasClasse),
  }));
}

/**
 * Tabela "Posição Atual": valor investido e % atual (classe e carteira) para cada ativo.
 */
export function tabelaPosicaoAtual(ativos) {
  return ativos.map((ativo) => ({
    ...ativo,
    valorInvestido: valorInvestido(ativo),
    pctAtualClasse: percentualAtivoNaClasse(ativos, ativo),
    pctAtualCarteira: percentualAtivoNaCarteira(ativos, ativo),
  }));
}

/**
 * Validação simples: a soma das metas de classe fecha em 100%?
 */
export function metasClasseValidas(metasClasse) {
  const soma = somaMetasClasse(metasClasse);
  return Math.abs(soma - 100) < 0.05;
}
