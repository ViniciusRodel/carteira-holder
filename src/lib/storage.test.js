// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { storage } from "./storage";

beforeEach(() => {
  localStorage.clear();
});

describe("carregar* / salvar* — round-trip básico por entidade", () => {
  it("ativos", () => {
    const ativos = [{ codigo: "A", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 5 }];
    storage.salvarAtivos(ativos);
    expect(storage.carregarAtivos([])).toEqual(ativos);
  });

  it("metasClasse", () => {
    const metas = { Ações: 30, FIIs: 70 };
    storage.salvarMetasClasse(metas);
    expect(storage.carregarMetasClasse({})).toEqual(metas);
  });

  it("aporte", () => {
    storage.salvarAporte(2500);
    expect(storage.carregarAporte(0)).toBe(2500);
  });

  it("excluidos", () => {
    storage.salvarExcluidos(["A", "B"]);
    expect(storage.carregarExcluidos([])).toEqual(["A", "B"]);
  });

  it("brapiToken", () => {
    storage.salvarBrapiToken("meu-token");
    expect(storage.carregarBrapiToken()).toBe("meu-token");
  });

  it("historico", () => {
    const historico = [{ codigo: "A", tipo: "compra", data: "2026-01-01T00:00:00.000Z" }];
    storage.salvarHistorico(historico);
    expect(storage.carregarHistorico()).toEqual(historico);
  });
});

describe("fallback quando não há valor salvo", () => {
  it("retorna o fallback informado quando a chave não existe", () => {
    expect(storage.carregarAtivos("FALLBACK_ATIVOS")).toBe("FALLBACK_ATIVOS");
    expect(storage.carregarMetasClasse("FALLBACK_METAS")).toBe("FALLBACK_METAS");
    expect(storage.carregarAporte(1000)).toBe(1000);
    expect(storage.carregarExcluidos(["default"])).toEqual(["default"]);
  });

  it("carregarBrapiToken retorna string vazia quando não há token salvo (sem precisar de fallback explícito)", () => {
    expect(storage.carregarBrapiToken()).toBe("");
  });

  it("carregarHistorico retorna array vazio quando não há histórico salvo", () => {
    expect(storage.carregarHistorico()).toEqual([]);
  });
});

describe("resiliência a dados corrompidos", () => {
  it("retorna o fallback quando o JSON salvo está corrompido, em vez de lançar", () => {
    localStorage.setItem("carteira:ativos", "{isso não é json válido");
    expect(() => storage.carregarAtivos([{ codigo: "FALLBACK" }])).not.toThrow();
    expect(storage.carregarAtivos([{ codigo: "FALLBACK" }])).toEqual([{ codigo: "FALLBACK" }]);
  });

  it("não lança quando localStorage.setItem falha (ex: quota excedida ou modo privado)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => storage.salvarAtivos([{ codigo: "X" }])).not.toThrow();
    spy.mockRestore();
  });

  it("não lança quando localStorage.getItem falha", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("acesso negado");
    });
    expect(() => storage.carregarAtivos("fallback")).not.toThrow();
    expect(storage.carregarAtivos("fallback")).toBe("fallback");
    spy.mockRestore();
  });
});

describe("limparTudo", () => {
  it("remove exatamente as chaves do namespace carteira:, sem tocar em chaves externas", () => {
    localStorage.setItem("outraApp:config", "mantido");
    storage.salvarAtivos([{ codigo: "A" }]);
    storage.salvarMetasClasse({ Ações: 100 });
    storage.salvarAporte(500);
    storage.salvarExcluidos(["A"]);
    storage.salvarBrapiToken("tok");
    storage.salvarHistorico([{ codigo: "A" }]);

    storage.limparTudo();

    expect(localStorage.getItem("carteira:ativos")).toBeNull();
    expect(localStorage.getItem("carteira:metasClasse")).toBeNull();
    expect(localStorage.getItem("carteira:aporte")).toBeNull();
    expect(localStorage.getItem("carteira:excluidos")).toBeNull();
    expect(localStorage.getItem("carteira:brapiToken")).toBeNull();
    expect(localStorage.getItem("carteira:historico")).toBeNull();
    expect(localStorage.getItem("outraApp:config")).toBe("mantido");
  });
});
