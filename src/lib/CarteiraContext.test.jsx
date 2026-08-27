// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CarteiraProvider, useCarteira } from "./CarteiraContext";
import { ATIVOS_INICIAIS, METAS_CLASSE_INICIAIS } from "./dadosIniciais";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  localStorage.clear();
  // Carteira vazia por padrão: cada teste adiciona só o(s) ativo(s) que precisa,
  // evitando depender do conteúdo dos ~55 ativos de exemplo em dadosIniciais.js.
  localStorage.setItem("carteira:ativos", "[]");
});

function renderCarteira() {
  return renderHook(() => useCarteira(), {
    wrapper: ({ children }) => <CarteiraProvider>{children}</CarteiraProvider>,
  });
}

describe("atualizarCotacaoUnica — Criptomoedas (CoinGecko)", () => {
  it("atualiza a cotação do ativo quando a API responde com sucesso", async () => {
    server.use(
      http.get("https://api.coingecko.com/api/v3/simple/price", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("ids")).toBe("bitcoin");
        return HttpResponse.json({ bitcoin: { brl: 350000 } });
      })
    );

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("BTC", "Criptomoedas");
    });

    expect(resposta).toEqual({ ok: true, preco: 350000 });
    expect(result.current.ativos.find((a) => a.codigo === "BTC").cotacao).toBe(350000);
  });

  it("retorna erro e não altera o estado quando a API responde com falha HTTP", async () => {
    server.use(
      http.get("https://api.coingecko.com/api/v3/simple/price", () => new HttpResponse(null, { status: 500 }))
    );

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("BTC", "Criptomoedas");
    });

    expect(resposta.ok).toBe(false);
    expect(resposta.erro).toContain("500");
    expect(result.current.ativos.find((a) => a.codigo === "BTC").cotacao).toBe(0);
  });

  it("retorna erro quando a moeda não é encontrada na resposta", async () => {
    server.use(
      http.get("https://api.coingecko.com/api/v3/simple/price", () => HttpResponse.json({}))
    );

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("BTC", "Criptomoedas");
    });

    expect(resposta.ok).toBe(false);
    expect(resposta.erro).toContain("não encontrada");
  });
});

describe("atualizarCotacaoUnica — B3 (brapi.dev)", () => {
  it("retorna erro imediato quando não há token configurado, sem chamar a API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("ITUB3", "Ações");
    });

    expect(resposta).toEqual({ ok: false, erro: "Token não configurado" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("interpreta o formato aninhado da resposta (results[0].data.regularMarketPrice)", async () => {
    server.use(
      http.get("https://brapi.dev/api/v2/stocks/quote", ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer tok-123");
        return HttpResponse.json({ results: [{ data: { regularMarketPrice: 32.5 } }] });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("ITUB3", "Ações");
    });

    expect(resposta).toEqual({ ok: true, preco: 32.5 });
    expect(result.current.ativos.find((a) => a.codigo === "ITUB3").cotacao).toBe(32.5);
  });

  it("interpreta o formato plano da resposta como fallback (results[0].regularMarketPrice)", async () => {
    server.use(
      http.get("https://brapi.dev/api/v2/stocks/quote", () =>
        HttpResponse.json({ results: [{ regularMarketPrice: 41.2 }] })
      )
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarCotacaoUnica("ITUB3", "Ações");
    });

    expect(resposta).toEqual({ ok: true, preco: 41.2 });
  });
});

describe("atualizarCotacoes — atualização em lote", () => {
  it("bloqueia o lote inteiro (B3 e cripto) quando não há token, mesmo com ativos cripto presentes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    await act(async () => {
      await result.current.atualizarCotacoes();
    });

    expect(result.current.statusCotacao.erro).toContain("Token brapi.dev não configurado");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("acumula erros de símbolos individuais sem interromper a atualização dos demais", async () => {
    server.use(
      http.get("https://brapi.dev/api/v2/stocks/quote", ({ request }) => {
        const symbol = new URL(request.url).searchParams.get("symbols");
        if (symbol === "PETR4") return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ results: [{ regularMarketPrice: 32.5 }] });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
      result.current.adicionarAtivo({ codigo: "PETR4", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 0, quantidade: 1 });
    });

    await act(async () => {
      await result.current.atualizarCotacoes();
    });

    expect(result.current.ativos.find((a) => a.codigo === "ITUB3").cotacao).toBe(32.5);
    expect(result.current.ativos.find((a) => a.codigo === "PETR4").cotacao).toBe(0);
    expect(result.current.statusCotacao.atualizados).toBe(1);
    expect(result.current.statusCotacao.erro).toContain("1 atualizados");
    expect(result.current.statusCotacao.erro).toContain("1 com erro");
  }, 10000);
});

describe("resetarParaExemplo", () => {
  it("restaura ativos, metas, aporte e exclusões para os valores iniciais e limpa o histórico", async () => {
    const { result } = renderCarteira();

    act(() => {
      result.current.adicionarAtivo({ codigo: "X", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 1 });
      result.current.adicionarHistorico({ codigo: "X", tipo: "compra" });
      result.current.setAporte(9999);
      result.current.alternarExclusao("X");
    });

    expect(result.current.historico.length).toBe(1);

    act(() => {
      result.current.resetarParaExemplo();
    });

    expect(result.current.ativos).toEqual(ATIVOS_INICIAIS);
    expect(result.current.metasClasse).toEqual(METAS_CLASSE_INICIAIS);
    expect(result.current.aporte).toBe(1000);
    expect(result.current.excluidos.size).toBe(0);
    expect(result.current.historico).toEqual([]);
  });
});

describe("atualizarProventos — sem token", () => {
  it("não chama a API e registra erro quando o token não está configurado", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 });
    });

    await act(async () => {
      await result.current.atualizarProventos({ forcar: true });
    });

    expect(result.current.statusProventos.erro).toContain("Token brapi.dev não configurado");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("atualizarProventoUnico — busca individual por ativo", () => {
  it("consulta /stocks/dividends para uma Ação e cruza com a quantidade atual", async () => {
    const ontem = new Date(Date.now() - 86400000).toISOString();

    server.use(
      http.get("https://brapi.dev/api/v2/stocks/dividends", ({ request }) => {
        expect(new URL(request.url).searchParams.get("symbols")).toBe("ITUB3");
        return HttpResponse.json({
          results: [{ symbol: "ITUB3", cashDividends: [{ dividendType: "DIVIDEND", rate: 1, paymentDate: ontem }] }],
        });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 100 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarProventoUnico("ITUB3", "Ações");
    });

    expect(resposta).toEqual({ ok: true, quantidade: 1 });
    const porItub = result.current.proventos.find((p) => p.codigo === "ITUB3");
    expect(porItub.tipo).toBe("DIVIDENDO");
    expect(porItub.status).toBe("PAGO");
    expect(porItub.valorEstimado).toBe(100); // 1 * 100
  }, 10000);

  it("consulta /fii/dividends para um FII", async () => {
    const ontem = new Date(Date.now() - 86400000).toISOString();

    server.use(
      http.get("https://brapi.dev/api/v2/fii/dividends", ({ request }) => {
        expect(new URL(request.url).searchParams.get("symbols")).toBe("MXRF11");
        return HttpResponse.json({
          results: [{ symbol: "MXRF11", cashDividends: [{ rate: 0.09, paymentDate: ontem }] }],
        });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "MXRF11", classe: "FIIs", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 200 });
    });

    await act(async () => {
      await result.current.atualizarProventoUnico("MXRF11", "FIIs");
    });

    const porMxrf = result.current.proventos.find((p) => p.codigo === "MXRF11");
    expect(porMxrf.tipo).toBe("RENDIMENTO_FII");
    expect(porMxrf.valorEstimado).toBeCloseTo(18); // 0.09 * 200
  }, 10000);

  it("retorna erro imediato quando não há token configurado, sem chamar a API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { result } = renderCarteira();
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 });
    });

    let resposta;
    await act(async () => {
      resposta = await result.current.atualizarProventoUnico("ITUB3", "Ações");
    });

    expect(resposta).toEqual({ ok: false, erro: "Token não configurado" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("atualizarProventos — busca sequencial de todos os ativos elegíveis", () => {
  it("busca item a item (Ações e FIIs), ignora Criptomoedas e acumula erros sem interromper os demais", async () => {
    const ontem = new Date(Date.now() - 86400000).toISOString();

    server.use(
      http.get("https://brapi.dev/api/v2/stocks/dividends", ({ request }) => {
        const symbol = new URL(request.url).searchParams.get("symbols");
        if (symbol === "PETR4") return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          results: [{ symbol, cashDividends: [{ dividendType: "DIVIDEND", rate: 1, paymentDate: ontem }] }],
        });
      }),
      http.get("https://brapi.dev/api/v2/fii/dividends", ({ request }) => {
        const symbol = new URL(request.url).searchParams.get("symbols");
        return HttpResponse.json({
          results: [{ symbol, cashDividends: [{ rate: 0.5, paymentDate: ontem }] }],
        });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 });
      result.current.adicionarAtivo({ codigo: "PETR4", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 });
      result.current.adicionarAtivo({ codigo: "MXRF11", classe: "FIIs", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 10 });
      result.current.adicionarAtivo({ codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 1000, quantidade: 1 });
    });

    await act(async () => {
      await result.current.atualizarProventos({ forcar: true });
    });

    expect(result.current.proventos.find((p) => p.codigo === "ITUB3")).toBeTruthy();
    expect(result.current.proventos.find((p) => p.codigo === "MXRF11")).toBeTruthy();
    expect(result.current.proventos.find((p) => p.codigo === "PETR4")).toBeUndefined();
    expect(result.current.proventos.find((p) => p.codigo === "BTC")).toBeUndefined();
    expect(result.current.statusProventos.erro).toContain("1/3 ativo(s) com erro");
    expect(result.current.statusProventos.erro).toContain("PETR4");
  }, 10000);
});

describe("atualizarProventos — cache com TTL", () => {
  it("não repete a busca dentro do TTL, a menos que forçado", async () => {
    let chamadas = 0;
    server.use(
      http.get("https://brapi.dev/api/v2/stocks/dividends", () => {
        chamadas++;
        return HttpResponse.json({ results: [] });
      })
    );

    const { result } = renderCarteira();
    await act(async () => {
      result.current.setBrapiToken("tok-123");
    });
    act(() => {
      result.current.adicionarAtivo({ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 });
    });

    await act(async () => {
      await result.current.atualizarProventos({ forcar: true });
    });
    expect(chamadas).toBe(1);

    await act(async () => {
      await result.current.atualizarProventos();
    });
    expect(chamadas).toBe(1);

    await act(async () => {
      await result.current.atualizarProventos({ forcar: true });
    });
    expect(chamadas).toBe(2);
  }, 10000);
});

describe("ciclo de vida do polling de cotações", () => {
  it("limpa o intervalo de atualização automática ao desmontar", () => {
    const clearSpy = vi.spyOn(global, "clearInterval");
    const { unmount } = renderCarteira();

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
