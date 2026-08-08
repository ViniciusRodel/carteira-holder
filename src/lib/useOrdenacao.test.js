// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrdenacao, aplicarOrdenacao } from "./useOrdenacao";

describe("useOrdenacao", () => {
  it("começa com a coluna e direção padrão informadas", () => {
    const { result } = renderHook(() => useOrdenacao("codigo", "asc"));
    expect(result.current.ordenacao).toEqual({ campo: "codigo", direcao: "asc" });
  });

  it("primeiro clique numa coluna nova ordena em desc, independentemente da direção anterior", () => {
    const { result } = renderHook(() => useOrdenacao("codigo", "asc"));
    act(() => result.current.alternarOrdem("cotacao"));
    expect(result.current.ordenacao).toEqual({ campo: "cotacao", direcao: "desc" });
  });

  it("clicar de novo na mesma coluna alterna desc -> asc -> desc", () => {
    const { result } = renderHook(() => useOrdenacao(null, "desc"));
    act(() => result.current.alternarOrdem("valorAportar"));
    expect(result.current.ordenacao.direcao).toBe("desc");
    act(() => result.current.alternarOrdem("valorAportar"));
    expect(result.current.ordenacao.direcao).toBe("asc");
    act(() => result.current.alternarOrdem("valorAportar"));
    expect(result.current.ordenacao.direcao).toBe("desc");
  });

  it("trocar de coluna reseta a direção para desc, mesmo vindo de asc", () => {
    const { result } = renderHook(() => useOrdenacao(null, "desc"));
    act(() => result.current.alternarOrdem("codigo"));
    act(() => result.current.alternarOrdem("codigo")); // agora asc
    expect(result.current.ordenacao.direcao).toBe("asc");
    act(() => result.current.alternarOrdem("cotacao")); // coluna diferente
    expect(result.current.ordenacao).toEqual({ campo: "cotacao", direcao: "desc" });
  });
});

describe("aplicarOrdenacao", () => {
  it("retorna a lista original quando não há campo de ordenação", () => {
    const lista = [{ codigo: "B" }, { codigo: "A" }];
    expect(aplicarOrdenacao(lista, { campo: null, direcao: "desc" })).toEqual(lista);
  });

  it("não muta a lista original (retorna uma cópia ordenada)", () => {
    const lista = [{ v: 2 }, { v: 1 }, { v: 3 }];
    const original = [...lista];
    aplicarOrdenacao(lista, { campo: "v", direcao: "asc" });
    expect(lista).toEqual(original);
  });

  it("ordena números crescente e decrescente corretamente", () => {
    const lista = [{ v: 30 }, { v: 5 }, { v: 100 }];
    expect(aplicarOrdenacao(lista, { campo: "v", direcao: "asc" }).map((x) => x.v)).toEqual([5, 30, 100]);
    expect(aplicarOrdenacao(lista, { campo: "v", direcao: "desc" }).map((x) => x.v)).toEqual([100, 30, 5]);
  });

  it("ordena strings com localeCompare pt-BR (acentuação correta)", () => {
    const lista = [{ nome: "Éder" }, { nome: "Ana" }, { nome: "Zeca" }];
    expect(aplicarOrdenacao(lista, { campo: "nome", direcao: "asc" }).map((x) => x.nome)).toEqual([
      "Ana",
      "Éder",
      "Zeca",
    ]);
  });

  it("valores null/undefined sempre vão para o final, em asc e em desc", () => {
    const lista = [{ v: 10 }, { v: null }, { v: 5 }, { v: undefined }];
    expect(aplicarOrdenacao(lista, { campo: "v", direcao: "asc" }).map((x) => x.v)).toEqual([5, 10, null, undefined]);
    expect(aplicarOrdenacao(lista, { campo: "v", direcao: "desc" }).map((x) => x.v)).toEqual([10, 5, null, undefined]);
  });
});
