import { describe, it, expect } from "vitest";
import {
  TIPO_PROVENTO,
  normalizarProventoAcao,
  normalizarProventoFii,
  mapearRespostaAcao,
  mapearRespostaFii,
  dentroDoEscopoHistorico,
  paraProventoPosicao,
  montarResumo,
} from "./proventos";

describe("normalizarProventoAcao", () => {
  it("reconhece dividendo comum pelo dividendType", () => {
    const p = normalizarProventoAcao("ITUB3", {
      dividendType: "DIVIDEND",
      paymentDate: "2020-01-01T00:00:00.000Z",
      lastDatePrior: "2019-12-15T00:00:00.000Z",
      rate: 1.5,
    });
    expect(p).toEqual({
      codigo: "ITUB3",
      tipo: TIPO_PROVENTO.DIVIDENDO,
      dataCom: "2019-12-15T00:00:00.000Z",
      dataPagamento: "2020-01-01T00:00:00.000Z",
      valorPorAtivo: 1.5,
      status: "PAGO",
    });
  });

  it("reconhece JCP pelo label mesmo quando dividendType não ajuda", () => {
    const p = normalizarProventoAcao("BBAS3", {
      dividendType: "EARNING",
      label: "Juros sobre Capital Próprio",
      paymentDate: "2020-01-01T00:00:00.000Z",
      rate: 0.8,
    });
    expect(p.tipo).toBe(TIPO_PROVENTO.JCP);
  });

  it("cai em OUTRO quando não reconhece nem dividendType nem label", () => {
    const p = normalizarProventoAcao("XPTO3", { paymentDate: "2020-01-01T00:00:00.000Z", rate: 1 });
    expect(p.tipo).toBe(TIPO_PROVENTO.OUTRO);
  });

  it("aceita tipoForcado, ignorando a inferência por label", () => {
    const p = normalizarProventoAcao("XPTO3", { dividendType: "DIVIDEND", rate: 1 }, TIPO_PROVENTO.BONIFICACAO);
    expect(p.tipo).toBe(TIPO_PROVENTO.BONIFICACAO);
  });

  it("classifica como PREVISTO quando a data de pagamento é futura", () => {
    const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const p = normalizarProventoAcao("ITUB3", { dividendType: "DIVIDEND", paymentDate: futuro, rate: 1 });
    expect(p.status).toBe("PREVISTO");
  });

  it("classifica como PREVISTO quando não há data de pagamento definida", () => {
    const p = normalizarProventoAcao("ITUB3", { dividendType: "DIVIDEND", rate: 1 });
    expect(p.status).toBe("PREVISTO");
    expect(p.dataPagamento).toBeNull();
  });
});

describe("normalizarProventoFii", () => {
  it("sempre classifica como RENDIMENTO_FII", () => {
    const p = normalizarProventoFii("MXRF11", { paymentDate: "2020-01-01T00:00:00.000Z", rate: 0.09 });
    expect(p.tipo).toBe(TIPO_PROVENTO.RENDIMENTO_FII);
    expect(p.valorPorAtivo).toBe(0.09);
    expect(p.status).toBe("PAGO");
  });
});

describe("mapearRespostaAcao", () => {
  it("junta cashDividends, stockDividends e subscriptions com o tipo correto de cada array", () => {
    const item = {
      cashDividends: [{ dividendType: "DIVIDEND", rate: 1, paymentDate: "2020-01-01T00:00:00.000Z" }],
      stockDividends: [{ rate: 0.1, paymentDate: "2020-02-01T00:00:00.000Z" }],
      subscriptions: [{ rate: 5, paymentDate: "2020-03-01T00:00:00.000Z" }],
    };
    const resultado = mapearRespostaAcao("ITUB3", item);
    expect(resultado).toHaveLength(3);
    expect(resultado.map((p) => p.tipo)).toEqual([
      TIPO_PROVENTO.DIVIDENDO,
      TIPO_PROVENTO.BONIFICACAO,
      TIPO_PROVENTO.SUBSCRICAO,
    ]);
  });

  it("retorna lista vazia quando o item não tem nenhum dos três arrays", () => {
    expect(mapearRespostaAcao("ITUB3", {})).toEqual([]);
  });
});

describe("mapearRespostaFii", () => {
  it("lê cashDividends quando presente", () => {
    const resultado = mapearRespostaFii("MXRF11", { cashDividends: [{ rate: 0.09, paymentDate: "2020-01-01T00:00:00.000Z" }] });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe(TIPO_PROVENTO.RENDIMENTO_FII);
  });

  it("cai para o campo dividends como fallback", () => {
    const resultado = mapearRespostaFii("MXRF11", { dividends: [{ rate: 0.09, paymentDate: "2020-01-01T00:00:00.000Z" }] });
    expect(resultado).toHaveLength(1);
  });
});

describe("dentroDoEscopoHistorico", () => {
  it("mantém sempre eventos PREVISTOS, independentemente do ano", () => {
    const provento = { status: "PREVISTO", dataPagamento: "2031-01-01T00:00:00.000Z" };
    expect(dentroDoEscopoHistorico(provento, 2026)).toBe(true);
  });

  it("mantém PAGO cuja data de pagamento é do ano de referência", () => {
    const provento = { status: "PAGO", dataPagamento: "2026-03-01T00:00:00.000Z" };
    expect(dentroDoEscopoHistorico(provento, 2026)).toBe(true);
  });

  it("descarta PAGO de anos anteriores ao de referência", () => {
    const provento = { status: "PAGO", dataPagamento: "2024-03-01T00:00:00.000Z" };
    expect(dentroDoEscopoHistorico(provento, 2026)).toBe(false);
  });

  it("descarta PAGO sem data de pagamento (não há como avaliar o ano)", () => {
    const provento = { status: "PAGO", dataPagamento: null };
    expect(dentroDoEscopoHistorico(provento, 2026)).toBe(false);
  });
});

describe("paraProventoPosicao", () => {
  it("calcula o valor estimado como valorPorAtivo * quantidade e sinaliza a aproximação", () => {
    const provento = { codigo: "ITUB3", valorPorAtivo: 1.5, tipo: TIPO_PROVENTO.DIVIDENDO, status: "PAGO" };
    const resultado = paraProventoPosicao(provento, 100);
    expect(resultado.valorEstimado).toBe(150);
    expect(resultado.quantidade).toBe(100);
    expect(resultado.quantidadeAproximada).toBe(true);
  });

  it("trata quantidade ausente/zero como zero, sem lançar", () => {
    const provento = { valorPorAtivo: 1.5 };
    expect(paraProventoPosicao(provento, undefined).valorEstimado).toBe(0);
    expect(paraProventoPosicao(provento, 0).valorEstimado).toBe(0);
  });
});

describe("montarResumo", () => {
  const proventos = [
    { tipo: TIPO_PROVENTO.DIVIDENDO, status: "PAGO", valorEstimado: 100 },
    { tipo: TIPO_PROVENTO.JCP, status: "PAGO", valorEstimado: 50 },
    { tipo: TIPO_PROVENTO.RENDIMENTO_FII, status: "PAGO", valorEstimado: 30 },
    {
      codigo: "ITUB3",
      tipo: TIPO_PROVENTO.DIVIDENDO,
      status: "PREVISTO",
      valorEstimado: 20,
      dataPagamento: "2031-06-01T00:00:00.000Z",
    },
    {
      codigo: "PETR4",
      tipo: TIPO_PROVENTO.DIVIDENDO,
      status: "PREVISTO",
      valorEstimado: 15,
      dataPagamento: "2031-03-01T00:00:00.000Z",
    },
  ];

  it("soma total recebido (PAGO) e total previsto (PREVISTO) separadamente", () => {
    const resumo = montarResumo(proventos);
    expect(resumo.totalRecebido).toBe(180);
    expect(resumo.totalPrevisto).toBe(35);
  });

  it("soma por tipo considerando PAGO e PREVISTO juntos", () => {
    const resumo = montarResumo(proventos);
    expect(resumo.totalDividendos).toBe(135); // 100 + 20 + 15
    expect(resumo.totalJCP).toBe(50);
    expect(resumo.totalRendimentosFII).toBe(30);
  });

  it("aponta o próximo pagamento como o PREVISTO com data mais próxima", () => {
    const resumo = montarResumo(proventos);
    expect(resumo.proximoPagamento).toEqual({ codigo: "PETR4", data: "2031-03-01T00:00:00.000Z", valorEstimado: 15 });
  });

  it("retorna proximoPagamento null quando não há eventos previstos com data", () => {
    const resumo = montarResumo([{ tipo: TIPO_PROVENTO.DIVIDENDO, status: "PAGO", valorEstimado: 10 }]);
    expect(resumo.proximoPagamento).toBeNull();
  });
});
