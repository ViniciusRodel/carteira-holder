import { describe, it, expect } from "vitest";
import {
  valorInvestido,
  valorTotalInvestido,
  valorInvestidoPorClasse,
  percentualAtualClasse,
  percentualAtivoNaClasse,
  percentualAtivoNaCarteira,
  percentualMetaAtivoNaClasse,
  percentualMetaAtivoNaCarteira,
  somaMetasClasse,
  deficitAtivo,
  calcularRebalanceamento,
  resumoPorClasse,
  tabelaMetaAtivos,
  tabelaPosicaoAtual,
  metasClasseValidas,
} from "./calculos";

function ativo(overrides = {}) {
  return {
    codigo: "TEST3",
    classe: "Ações",
    nota: 1,
    precoTeto: 0,
    cotacao: 10,
    quantidade: 10,
    ...overrides,
  };
}

describe("valorInvestido", () => {
  it("multiplica cotação por quantidade", () => {
    expect(valorInvestido(ativo({ cotacao: 25, quantidade: 4 }))).toBe(100);
  });

  it("trata cotação e quantidade ausentes como zero", () => {
    expect(valorInvestido({})).toBe(0);
    expect(valorInvestido({ cotacao: 10 })).toBe(0);
    expect(valorInvestido({ quantidade: 10 })).toBe(0);
  });
});

describe("valorTotalInvestido / valorInvestidoPorClasse", () => {
  const ativos = [
    ativo({ codigo: "A", classe: "Ações", cotacao: 10, quantidade: 10 }), // 100
    ativo({ codigo: "B", classe: "FIIs", cotacao: 20, quantidade: 5 }), // 100
    ativo({ codigo: "C", classe: "Ações", cotacao: 5, quantidade: 20 }), // 100
  ];

  it("soma o valor investido de todos os ativos", () => {
    expect(valorTotalInvestido(ativos)).toBe(300);
  });

  it("soma apenas os ativos da classe pedida", () => {
    expect(valorInvestidoPorClasse(ativos, "Ações")).toBe(200);
    expect(valorInvestidoPorClasse(ativos, "FIIs")).toBe(100);
  });

  it("retorna zero para carteira vazia", () => {
    expect(valorTotalInvestido([])).toBe(0);
  });

  it("retorna zero para classe sem nenhum ativo", () => {
    expect(valorInvestidoPorClasse(ativos, "Criptomoedas")).toBe(0);
  });
});

describe("divisão por zero — carteira vazia e classes vazias", () => {
  it("percentualAtualClasse não lança e retorna 0 com carteira vazia", () => {
    expect(percentualAtualClasse([], "Ações")).toBe(0);
  });

  it("percentualAtivoNaClasse retorna 0 quando a classe do ativo não tem valor investido", () => {
    const ativos = [ativo({ codigo: "A", classe: "Ações", cotacao: 0, quantidade: 0 })];
    expect(percentualAtivoNaClasse(ativos, ativos[0])).toBe(0);
  });

  it("percentualAtivoNaCarteira retorna 0 quando o total investido é zero", () => {
    const ativos = [ativo({ cotacao: 0, quantidade: 0 })];
    expect(percentualAtivoNaCarteira(ativos, ativos[0])).toBe(0);
  });

  it("percentualMetaAtivoNaClasse retorna 0 quando a soma das notas da classe é zero", () => {
    const ativos = [ativo({ nota: 0 })];
    expect(percentualMetaAtivoNaClasse(ativos, ativos[0])).toBe(0);
  });
});

describe("nota ausente ou zero não gera NaN", () => {
  it("ativo sem campo nota é tratado como nota 0, sem quebrar o cálculo dos demais", () => {
    const semNota = ativo({ codigo: "SEMNOTA", classe: "Ações" });
    delete semNota.nota;
    const comNota = ativo({ codigo: "COMNOTA", classe: "Ações", nota: 2 });
    const ativos = [semNota, comNota];

    expect(percentualMetaAtivoNaClasse(ativos, semNota)).toBe(0);
    expect(percentualMetaAtivoNaClasse(ativos, comNota)).toBe(1);
    expect(Number.isNaN(percentualMetaAtivoNaClasse(ativos, semNota))).toBe(false);
  });

  it("quando todas as notas da classe são zero, todos os percentuais de meta são 0, não NaN", () => {
    const ativos = [
      ativo({ codigo: "A", classe: "Ações", nota: 0 }),
      ativo({ codigo: "B", classe: "Ações", nota: 0 }),
    ];
    for (const a of ativos) {
      expect(percentualMetaAtivoNaClasse(ativos, a)).toBe(0);
    }
  });
});

describe("percentualMetaAtivoNaCarteira", () => {
  it("combina % do ativo na classe (meta) com % meta da classe na carteira", () => {
    const ativos = [
      ativo({ codigo: "A", classe: "Ações", nota: 1 }),
      ativo({ codigo: "B", classe: "Ações", nota: 3 }),
    ];
    const metasClasse = { Ações: 40 };

    // A tem 1/4 da nota da classe, classe vale 40% da carteira -> 10%
    expect(percentualMetaAtivoNaCarteira(ativos, ativos[0], metasClasse)).toBeCloseTo(0.1);
    // B tem 3/4 da nota da classe -> 30%
    expect(percentualMetaAtivoNaCarteira(ativos, ativos[1], metasClasse)).toBeCloseTo(0.3);
  });

  it("retorna 0 quando a classe do ativo não tem meta definida", () => {
    const ativos = [ativo({ classe: "Ações", nota: 1 })];
    expect(percentualMetaAtivoNaCarteira(ativos, ativos[0], {})).toBe(0);
  });
});

describe("somaMetasClasse / metasClasseValidas", () => {
  it("soma corretamente as metas de todas as classes", () => {
    expect(somaMetasClasse({ Ações: 30, FIIs: 29, "Renda Fixa": 41 })).toBe(100);
  });

  it("considera válido quando a soma fecha exatamente em 100", () => {
    expect(metasClasseValidas({ Ações: 50, FIIs: 50 })).toBe(true);
  });

  it("considera válido dentro da tolerância de 0.05 (limite inclusivo abaixo)", () => {
    // soma = 99.951 -> |99.951 - 100| = 0.049 < 0.05
    expect(metasClasseValidas({ Ações: 49.951, FIIs: 50 })).toBe(true);
  });

  it("considera inválido fora da tolerância de 0.05", () => {
    // soma = 99.94 -> |99.94 - 100| = 0.06, não é < 0.05
    expect(metasClasseValidas({ Ações: 49.94, FIIs: 50 })).toBe(false);
  });

  it("é suscetível a imprecisão de ponto flutuante perto da borda da tolerância", () => {
    // 49.95 + 50 deveria fechar em soma=100, diff=0.05 (>= tolerância, logo inválido).
    // Na prática, 49.95 + 50 = 99.95 mas o diff em ponto flutuante fica em
    // 0.049999999999997 (< 0.05), então isso passa como válido — um caso real
    // em que a soma "no papel" fecha na borda, mas o cálculo aceita por 1 ULP de sobra.
    // Travado aqui como documentação do comportamento atual, não como o ideal.
    expect(metasClasseValidas({ Ações: 49.95, FIIs: 50 })).toBe(true);
  });

  it("considera inválido quando a diferença é claramente maior que a tolerância, sem ambiguidade de ponto flutuante", () => {
    expect(metasClasseValidas({ Ações: 49.9, FIIs: 50 })).toBe(false);
  });

  it("considera inválido quando a soma está muito longe de 100", () => {
    expect(metasClasseValidas({ Ações: 30, FIIs: 30 })).toBe(false);
  });
});

describe("deficitAtivo", () => {
  it("é positivo quando o ativo está abaixo da meta", () => {
    const ativos = [
      ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 10, quantidade: 0 }),
      ativo({ codigo: "B", classe: "Ações", nota: 1, cotacao: 10, quantidade: 10 }),
    ];
    const metasClasse = { Ações: 100 };
    // total = 100, meta de A na carteira = 50% -> metaValor 50, valorAtual 0 -> deficit 50
    expect(deficitAtivo(ativos, ativos[0], metasClasse)).toBe(50);
  });

  it("nunca é negativo quando o ativo já está acima da meta (clampado em 0)", () => {
    const ativos = [
      ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 10, quantidade: 100 }),
      ativo({ codigo: "B", classe: "Ações", nota: 1, cotacao: 10, quantidade: 0 }),
    ];
    const metasClasse = { Ações: 100 };
    expect(deficitAtivo(ativos, ativos[0], metasClasse)).toBe(0);
  });

  it("retorna 0 com carteira totalmente vazia de valor (total 0)", () => {
    const ativos = [ativo({ cotacao: 0, quantidade: 0 })];
    expect(deficitAtivo(ativos, ativos[0], { Ações: 100 })).toBe(0);
  });
});

describe("calcularRebalanceamento", () => {
  const ativos = [
    ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 10, quantidade: 0 }),
    ativo({ codigo: "B", classe: "Ações", nota: 1, cotacao: 10, quantidade: 20 }),
  ];
  const metasClasse = { Ações: 100 };

  it("distribui o aporte proporcionalmente ao déficit de cada ativo incluído", () => {
    const linhas = calcularRebalanceamento(ativos, metasClasse, 100);
    const linhaA = linhas.find((l) => l.codigo === "A");
    // total atual = 200, meta de cada um = 50% = 100. A tem déficit 100, B tem déficit 0.
    expect(linhaA.deficit).toBe(100);
    expect(linhaA.valorAportar).toBe(100);
    expect(linhaA.qtdComprar).toBe(10);
  });

  it("zera o déficit de ativos excluídos, mas eles continuam contando na meta da carteira", () => {
    const excluidos = new Set(["A"]);
    const linhas = calcularRebalanceamento(ativos, metasClasse, 100, excluidos);
    const linhaA = linhas.find((l) => l.codigo === "A");
    const linhaB = linhas.find((l) => l.codigo === "B");

    expect(linhaA.incluido).toBe(false);
    expect(linhaA.deficit).toBe(0);
    expect(linhaA.valorAportar).toBe(0);
    // pctMeta de A continua sendo calculado com base em todos os ativos da classe,
    // exclusão do aporte não remove o ativo do denominador de meta da carteira.
    expect(linhaA.pctMeta).toBeCloseTo(0.5);
    // Como A foi excluído e é o único com déficit, a soma de déficits fica 0 e B não recebe nada.
    expect(linhaB.valorAportar).toBe(0);
  });

  it("nunca aloca mais do que o valor do aporte, mesmo com arredondamento por Math.floor", () => {
    const carteiraComResto = [
      ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 7, quantidade: 0 }),
      ativo({ codigo: "B", classe: "Ações", nota: 1, cotacao: 13, quantidade: 0 }),
      ativo({ codigo: "C", classe: "Ações", nota: 1, cotacao: 33, quantidade: 0 }),
    ];
    const linhas = calcularRebalanceamento(carteiraComResto, { Ações: 100 }, 1000);
    const somaComprada = linhas.reduce((acc, l) => acc + l.vlrCompra, 0);

    expect(somaComprada).toBeLessThanOrEqual(1000);
    // Math.floor por linha deixa sobra de caixa não alocada — comportamento esperado,
    // travado aqui para não virar regressão silenciosa se o arredondamento mudar.
    expect(somaComprada).toBeLessThan(1000);
  });

  it("não aloca nada quando a soma dos déficits é zero", () => {
    const carteiraNaMeta = [
      ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 10, quantidade: 10 }),
    ];
    const linhas = calcularRebalanceamento(carteiraNaMeta, { Ações: 100 }, 500);
    expect(linhas[0].valorAportar).toBe(0);
    expect(linhas[0].qtdComprar).toBe(0);
  });

  it("não compra fração quando a cotação é zero (evita divisão por zero)", () => {
    const ativos2 = [ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 0, quantidade: 0 })];
    const linhas = calcularRebalanceamento(ativos2, { Ações: 100 }, 500);
    expect(linhas[0].qtdComprar).toBe(0);
  });
});

describe("resumoPorClasse", () => {
  it("calcula atingimento como pctAtual / pctMeta", () => {
    const ativos = [ativo({ classe: "Ações", cotacao: 10, quantidade: 10 })]; // 100
    const resumo = resumoPorClasse(ativos, { Ações: 50 });
    expect(resumo[0].pctAtual).toBe(1); // única classe, 100% do total
    expect(resumo[0].pctMeta).toBe(0.5);
    expect(resumo[0].atingimento).toBe(2);
  });

  it("retorna atingimento 0 (não Infinity/NaN) quando a meta da classe é 0", () => {
    const ativos = [ativo({ classe: "Ações", cotacao: 10, quantidade: 10 })];
    const resumo = resumoPorClasse(ativos, { Ações: 0 });
    expect(resumo[0].atingimento).toBe(0);
    expect(Number.isFinite(resumo[0].atingimento)).toBe(true);
  });

  it("retorna pctAtual 0 para todas as classes quando a carteira está vazia", () => {
    const resumo = resumoPorClasse([], { Ações: 60, FIIs: 40 });
    expect(resumo.every((r) => r.pctAtual === 0)).toBe(true);
  });
});

describe("tabelaMetaAtivos / tabelaPosicaoAtual", () => {
  it("preserva os dados originais do ativo e adiciona os campos calculados", () => {
    const ativos = [ativo({ codigo: "A", classe: "Ações", nota: 1, cotacao: 10, quantidade: 5 })];
    const metaLinha = tabelaMetaAtivos(ativos, { Ações: 100 })[0];
    const posicaoLinha = tabelaPosicaoAtual(ativos)[0];

    expect(metaLinha.codigo).toBe("A");
    expect(metaLinha.pctClasse).toBe(1);
    expect(metaLinha.pctMetaClasse).toBe(1);
    expect(metaLinha.pctCarteira).toBe(1);

    expect(posicaoLinha.valorInvestido).toBe(50);
    expect(posicaoLinha.pctAtualClasse).toBe(1);
    expect(posicaoLinha.pctAtualCarteira).toBe(1);
  });
});
