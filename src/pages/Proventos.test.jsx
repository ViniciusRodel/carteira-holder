// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CarteiraProvider } from "../lib/CarteiraContext";
import { formatarMoeda } from "../lib/formato";
import Proventos from "./Proventos";

// Nenhum dos testes abaixo deveria precisar de rede por padrão — o cache de
// proventos é sempre semeado "fresco" (buscadoEm = agora), dentro do TTL,
// então atualizarProventos não dispara fetch no mount. O único fetch que pode
// disparar é o de cotações (atualizarCotacoes, roda sempre no mount quando há
// token) — mockado abaixo para não bater na rede real, igual ao restante da
// suíte. Testes que clicam num botão de busca registram seus próprios handlers.
const server = setupServer(
  http.get("https://brapi.dev/api/v2/stocks/quote", () => HttpResponse.json({ results: [] }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function seed({ ativos, brapiToken = "tok-123", cacheProventos }) {
  localStorage.setItem("carteira:ativos", JSON.stringify(ativos));
  localStorage.setItem("carteira:brapiToken", JSON.stringify(brapiToken));
  if (cacheProventos) {
    localStorage.setItem("carteira:proventos", JSON.stringify(cacheProventos));
  }
}

function renderProventos() {
  return render(
    <CarteiraProvider>
      <Proventos />
    </CarteiraProvider>
  );
}

function tabelaEventos() {
  return screen.getAllByRole("table")[1];
}

function tabelaAtivos() {
  return screen.getAllByRole("table")[0];
}

const ONTEM = new Date(Date.now() - 86400000).toISOString();

// Constrói um matcher tolerante ao tipo de espaço que o Intl.NumberFormat usa
// entre "R$" e o valor (pode ser espaço normal ou indivisível conforme o ICU
// do runtime) — escapa os caracteres especiais de regex (o "$" de "R$" em
// primeiro lugar) e troca os espaços literais por `\s+`.
function matcherMoeda(valor) {
  const escapado = formatarMoeda(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escapado.replace(/\s+/g, "\\s+"));
}

beforeEach(() => {
  localStorage.clear();
});

describe("Proventos — estado sem token", () => {
  it("exibe aviso para configurar o token quando ele não está salvo", () => {
    seed({ ativos: [], brapiToken: "" });
    renderProventos();
    // Texto exato (sem o "." final) para não colidir com o badge de status,
    // que reusa a mesma frase inicial seguida de instrução adicional.
    expect(screen.getByText("Token brapi.dev não configurado")).toBeTruthy();
  });
});

describe("Proventos — tabela de ativos (busca individual)", () => {
  it("lista todos os ativos elegíveis (Ações/ETFs/FIIs), mesmo sem provento buscado ainda", () => {
    seed({
      ativos: [
        { codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 },
        { codigo: "MXRF11", classe: "FIIs", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 20 },
        { codigo: "CDB-XP", classe: "Renda Fixa", nota: 1, precoTeto: 0, cotacao: 1, quantidade: 1 },
        { codigo: "BTC", classe: "Criptomoedas", nota: 1, precoTeto: 0, cotacao: 1000, quantidade: 1 },
      ],
    });

    renderProventos();

    const tabela = within(tabelaAtivos());
    expect(tabela.getByText("ITUB3")).toBeTruthy();
    expect(tabela.getByText("MXRF11")).toBeTruthy();
    expect(tabela.queryByText("CDB-XP")).toBeNull();
    expect(tabela.queryByText("BTC")).toBeNull();
    expect(tabela.getAllByText(/ainda não buscado/i)).toHaveLength(2);
  });

  it("mostra a contagem de proventos encontrados para um ativo já buscado", () => {
    seed({
      ativos: [{ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 }],
      cacheProventos: {
        buscadoEm: new Date().toISOString(),
        porAtivo: { ITUB3: [{ codigo: "ITUB3", tipo: "DIVIDENDO", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 1, status: "PAGO" }] },
      },
    });

    renderProventos();

    expect(within(tabelaAtivos()).getByText("1 encontrado")).toBeTruthy();
  });

  it("busca proventos de um único ativo ao clicar no botão da linha", async () => {
    server.use(
      http.get("https://brapi.dev/api/v2/stocks/dividends", () =>
        HttpResponse.json({ results: [{ symbol: "ITUB3", cashDividends: [{ dividendType: "DIVIDEND", rate: 1, paymentDate: ONTEM }] }] })
      )
    );

    seed({
      ativos: [{ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 }],
    });

    renderProventos();

    fireEvent.click(within(tabelaAtivos()).getByTitle("Buscar proventos de ITUB3"));

    await waitFor(() => expect(within(tabelaAtivos()).getByText("1 encontrado")).toBeTruthy());
    expect(within(tabelaEventos()).getByText("ITUB3")).toBeTruthy();
  });
});

describe("Proventos — cache já preenchido", () => {
  it("lista os proventos cruzando o valor por ativo com a quantidade atual", () => {
    seed({
      ativos: [
        { codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 100 },
        { codigo: "MXRF11", classe: "FIIs", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 200 },
      ],
      cacheProventos: {
        buscadoEm: new Date().toISOString(),
        porAtivo: {
          ITUB3: [{ codigo: "ITUB3", tipo: "DIVIDENDO", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 1, status: "PAGO" }],
          MXRF11: [{ codigo: "MXRF11", tipo: "RENDIMENTO_FII", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 0.09, status: "PAGO" }],
        },
      },
    });

    renderProventos();

    expect(within(tabelaEventos()).getByText("ITUB3")).toBeTruthy();
    expect(within(tabelaEventos()).getByText("MXRF11")).toBeTruthy();
    // Total recebido = 1*100 (ITUB3) + 0.09*200 (MXRF11) = 118
    expect(screen.getAllByText(matcherMoeda(118)).length).toBeGreaterThan(0);
  });

  it("o aviso de aproximação da quantidade está sempre visível", () => {
    seed({
      ativos: [{ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 }],
      cacheProventos: {
        buscadoEm: new Date().toISOString(),
        porAtivo: { ITUB3: [{ codigo: "ITUB3", tipo: "DIVIDENDO", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 1, status: "PAGO" }] },
      },
    });

    renderProventos();

    expect(screen.getByText(/não guarda a posição/i)).toBeTruthy();
  });

  it("filtra por tipo ao clicar nas abas, sem afetar a tabela de ativos", () => {
    seed({
      ativos: [
        { codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 },
        { codigo: "MXRF11", classe: "FIIs", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 20 },
      ],
      cacheProventos: {
        buscadoEm: new Date().toISOString(),
        porAtivo: {
          ITUB3: [{ codigo: "ITUB3", tipo: "DIVIDENDO", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 1, status: "PAGO" }],
          MXRF11: [{ codigo: "MXRF11", tipo: "RENDIMENTO_FII", dataCom: null, dataPagamento: ONTEM, valorPorAtivo: 0.09, status: "PAGO" }],
        },
      },
    });

    renderProventos();

    expect(within(tabelaEventos()).getByText("ITUB3")).toBeTruthy();
    expect(within(tabelaEventos()).getByText("MXRF11")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /rendimentos fii/i }));

    expect(within(tabelaEventos()).queryByText("ITUB3")).toBeNull();
    expect(within(tabelaEventos()).getByText("MXRF11")).toBeTruthy();
    // A tabela de ativos lista todos os elegíveis sempre, independente da aba
    expect(within(tabelaAtivos()).getByText("ITUB3")).toBeTruthy();
  });
});

describe("Proventos — sem nenhum provento", () => {
  it("exibe estado vazio quando o cache está preenchido mas nenhum ativo tem provento", () => {
    seed({
      ativos: [{ codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 30, quantidade: 10 }],
      cacheProventos: { buscadoEm: new Date().toISOString(), porAtivo: {} },
    });

    renderProventos();

    expect(screen.getByText(/nenhum provento encontrado/i)).toBeTruthy();
  });
});
