import { describe, it, expect } from "vitest";
import {
  formatarMoeda,
  formatarPercentual,
  formatarPercentualComSinal,
  formatarQuantidade,
  formatarNumero,
} from "./formato";

// Intl.NumberFormat("pt-BR") usa espaço não-quebrável ( ) entre "R$" e o valor,
// não um espaço comum — os testes precisam usar o mesmo caractere.
describe("formatarMoeda", () => {
  it("formata valores positivos em BRL", () => {
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56");
  });

  it("formata zero e negativos", () => {
    expect(formatarMoeda(0)).toBe("R$ 0,00");
    expect(formatarMoeda(-50)).toBe("-R$ 50,00");
  });

  it('retorna "—" para valores ausentes ou inválidos', () => {
    expect(formatarMoeda(null)).toBe("—");
    expect(formatarMoeda(undefined)).toBe("—");
    expect(formatarMoeda(NaN)).toBe("—");
  });
});

describe("formatarPercentual", () => {
  it("converte decimal para percentual com 2 casas por padrão", () => {
    expect(formatarPercentual(0.3)).toBe("30.00%");
  });

  it("respeita o número de casas decimais informado", () => {
    expect(formatarPercentual(0.3333, 0)).toBe("33%");
    expect(formatarPercentual(0.3333, 4)).toBe("33.3300%");
  });

  it('retorna "—" para valores ausentes ou inválidos', () => {
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarPercentual(NaN)).toBe("—");
  });
});

describe("formatarPercentualComSinal", () => {
  it("prefixa positivos com +", () => {
    expect(formatarPercentualComSinal(0.05)).toBe("+5.00%");
  });

  it("não prefixa negativos (o sinal de menos já vem do número)", () => {
    expect(formatarPercentualComSinal(-0.05)).toBe("-5.00%");
  });

  it("não prefixa zero", () => {
    expect(formatarPercentualComSinal(0)).toBe("0.00%");
  });
});

describe("formatarQuantidade", () => {
  it("usa 2 casas decimais para valores >= 100", () => {
    expect(formatarQuantidade(150.4567)).toBe("150,46");
  });

  it("usa até 4 casas decimais para valores entre 1 e 100", () => {
    expect(formatarQuantidade(10.123456)).toBe("10,1235");
  });

  it("usa até 8 casas decimais para valores menores que 1 (ex: fração de cripto)", () => {
    expect(formatarQuantidade(0.123456789)).toBe("0,12345679");
  });

  it('trata zero como "0" e não "0,00"', () => {
    expect(formatarQuantidade(0)).toBe("0");
  });

  it('retorna "—" para valores ausentes ou inválidos', () => {
    expect(formatarQuantidade(null)).toBe("—");
    expect(formatarQuantidade(NaN)).toBe("—");
  });
});

describe("formatarNumero", () => {
  it("usa formatação padrão (até 8 casas) quando casasDecimais não é informado", () => {
    expect(formatarNumero(1234.5)).toBe("1.234,5");
  });

  it("respeita casasDecimais fixas quando informado", () => {
    expect(formatarNumero(1234.5, 2)).toBe("1.234,50");
    expect(formatarNumero(1, 0)).toBe("1");
  });

  it('retorna "—" para valores ausentes ou inválidos', () => {
    expect(formatarNumero(null)).toBe("—");
    expect(formatarNumero(NaN, 2)).toBe("—");
  });
});
