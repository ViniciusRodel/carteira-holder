// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CarteiraProvider } from "../lib/CarteiraContext";
import Rebalanceamento from "./Rebalanceamento";

// ITUB3 está bem abaixo da meta da classe "Ações" (30%) e concentra todo o
// déficit da carteira -> o aporte padrão de R$ 1.000 é 100% sugerido para ele.
// PETR4 já está acima da meta -> nunca aparece com sugestão de compra, e serve
// como ativo com estoque suficiente para os cenários de venda.
const ATIVOS_SEED = [
  { codigo: "ITUB3", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 1 },
  { codigo: "PETR4", classe: "Ações", nota: 1, precoTeto: 0, cotacao: 10, quantidade: 100 },
];

function renderRebalanceamento() {
  localStorage.setItem("carteira:ativos", JSON.stringify(ATIVOS_SEED));
  return render(
    <CarteiraProvider>
      <Rebalanceamento />
    </CarteiraProvider>
  );
}

function linhaDoAtivo(codigo) {
  return screen.getByText(codigo).closest("tr");
}

function abrirModalManual(codigo) {
  fireEvent.click(within(linhaDoAtivo(codigo)).getByTitle("Lançar operação manualmente"));
  return document.querySelector(".modal-caixa");
}

function getInputQtd(modal) {
  return modal.querySelector('input[type="number"]');
}

beforeEach(() => {
  localStorage.clear();
});

describe("Rebalanceamento — botão de compra sugerida (comprarSugerido)", () => {
  it("compra a quantidade sugerida, atualiza a posição e registra toast + histórico", () => {
    renderRebalanceamento();

    const linha = linhaDoAtivo("ITUB3");
    const botaoComprar = linha.querySelector(".rebal-op-btn--comprar");
    expect(botaoComprar.disabled).toBe(false);

    fireEvent.click(botaoComprar);

    // 1 (inicial) + 100 (sugerido) = 101
    expect(within(linhaDoAtivo("ITUB3")).getByText("101")).toBeTruthy();
    expect(screen.getByText(/comprado 100 × itub3/i)).toBeTruthy();
  });

  it("abate o valor da compra do campo 'Valor do aporte'", () => {
    renderRebalanceamento();

    const inputAporte = document.querySelector(".input-aporte");
    // aporte padrão R$ 1.000; ITUB3 concentra todo o déficit -> vlrCompra = 100 × 10 = 1.000
    expect(Number(inputAporte.value)).toBe(1000);

    fireEvent.click(linhaDoAtivo("ITUB3").querySelector(".rebal-op-btn--comprar"));

    expect(Number(inputAporte.value)).toBe(0);
  });

  it("congela as sugestões ao comprar pelo ícone verde; só o botão Recalcular as atualiza", () => {
    renderRebalanceamento();

    // Sugestão inicial de ITUB3: 100 unidades
    expect(within(linhaDoAtivo("ITUB3")).getByText("100")).toBeTruthy();

    const botaoRecalcular = screen.getByRole("button", { name: /recalcular/i });
    expect(botaoRecalcular.disabled).toBe(true);

    fireEvent.click(linhaDoAtivo("ITUB3").querySelector(".rebal-op-btn--comprar"));

    // Posição foi para 101 e o aporte zerou, mas a sugestão continua "100" (plano congelado)
    expect(within(linhaDoAtivo("ITUB3")).getByText("101")).toBeTruthy();
    expect(within(linhaDoAtivo("ITUB3")).getByText("100")).toBeTruthy();
    // O botão verde daquela linha fica desabilitado até recalcular
    expect(linhaDoAtivo("ITUB3").querySelector(".rebal-op-btn--comprar").disabled).toBe(true);

    // Agora o Recalcular está habilitado
    expect(botaoRecalcular.disabled).toBe(false);
    fireEvent.click(botaoRecalcular);

    // Recalculado com aporte 0 -> ITUB3 deixa de sugerir compra
    expect(within(linhaDoAtivo("ITUB3")).queryByText("100")).toBeNull();
  });

  it("editar o campo 'Valor do aporte' não recalcula as sugestões até clicar em Recalcular", () => {
    renderRebalanceamento();

    expect(within(linhaDoAtivo("ITUB3")).getByText("100")).toBeTruthy();

    fireEvent.change(document.querySelector(".input-aporte"), { target: { value: "500" } });

    // Sugestão continua "100" (congelada), mas o Recalcular sinaliza pendência
    expect(within(linhaDoAtivo("ITUB3")).getByText("100")).toBeTruthy();
    const botaoRecalcular = screen.getByRole("button", { name: /recalcular/i });
    expect(botaoRecalcular.disabled).toBe(false);

    fireEvent.click(botaoRecalcular);

    // aporte 500 / cotação 10 = 50 unidades sugeridas
    expect(within(linhaDoAtivo("ITUB3")).getByText("50")).toBeTruthy();
    expect(within(linhaDoAtivo("ITUB3")).queryByText("100")).toBeNull();
  });

  it("o botão de compra sugerida fica desabilitado quando o ativo já está acima da meta", () => {
    renderRebalanceamento();
    const linha = linhaDoAtivo("PETR4");
    expect(linha.querySelector(".rebal-op-btn--comprar").disabled).toBe(true);
  });
});

describe("Rebalanceamento — modal manual de compra/venda", () => {
  it("abre no modo Comprar por padrão, mostrando o código do ativo no título", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("ITUB3");
    expect(within(modal).getByText(/comprar: itub3/i)).toBeTruthy();
  });

  it("compra manual: preview do valor, confirmação atualiza posição, toast e fecha o modal", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("ITUB3");

    fireEvent.change(getInputQtd(modal), { target: { value: "5" } });
    expect(within(modal).getByText(/compra estimada/i)).toBeTruthy();

    fireEvent.click(within(modal).getByRole("button", { name: "Comprar" }));

    expect(document.querySelector(".modal-caixa")).toBeNull();
    // 1 (inicial) + 5 = 6
    expect(within(linhaDoAtivo("ITUB3")).getByText("6")).toBeTruthy();
    expect(screen.getByText(/comprado 5 × itub3/i)).toBeTruthy();
  });

  it("rejeita valores inválidos no campo de quantidade (zero, negativo, não numérico)", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("ITUB3");
    const input = getInputQtd(modal);

    fireEvent.change(input, { target: { value: "0" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "-3" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input.value).toBe("");

    expect(within(modal).getByRole("button", { name: "Comprar" }).disabled).toBe(true);
  });

  it("venda manual dentro do estoque disponível reduz a posição corretamente", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("PETR4");

    fireEvent.click(modal.querySelector(".modal-tipo-btn--venda"));
    expect(within(modal).getByText(/vender: petr4/i)).toBeTruthy();

    fireEvent.change(getInputQtd(modal), { target: { value: "20" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Vender" }));

    // 100 (inicial) - 20 = 80
    expect(within(linhaDoAtivo("PETR4")).getByText("80")).toBeTruthy();
    expect(screen.getByText(/vendido 20 × petr4/i)).toBeTruthy();
  });

  it("bloqueia a venda quando a quantidade excede o estoque: avisa, desabilita o confirmar e não altera nada", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("PETR4");
    fireEvent.click(modal.querySelector(".modal-tipo-btn--venda"));

    fireEvent.change(getInputQtd(modal), { target: { value: "150" } });
    expect(within(modal).getByText(/você possui apenas 100 unidade\(s\)/i)).toBeTruthy();

    const botaoVender = within(modal).getByRole("button", { name: "Vender" });
    expect(botaoVender.disabled).toBe(true);

    // O botão desabilitado não dispara onClick, mas o Enter no formulário chama
    // onConfirmar() diretamente — a guarda precisa estar dentro de confirmarModal,
    // não só no `disabled` do botão. Simula esse atalho para provar que também é bloqueado.
    fireEvent.keyDown(modal, { key: "Enter" });

    expect(document.querySelector(".modal-caixa")).toBeTruthy();
    expect(within(linhaDoAtivo("PETR4")).getByText("100")).toBeTruthy();
    expect(screen.queryByText(/vendido 150/i)).toBeNull();
  });

  it("permite vender exatamente a quantidade total em estoque (limite não é bloqueado por engano)", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("PETR4");
    fireEvent.click(modal.querySelector(".modal-tipo-btn--venda"));

    fireEvent.change(getInputQtd(modal), { target: { value: "100" } });
    expect(screen.queryByText(/você possui apenas/i)).toBeNull();
    expect(within(modal).getByRole("button", { name: "Vender" }).disabled).toBe(false);

    fireEvent.click(within(modal).getByRole("button", { name: "Vender" }));

    expect(within(linhaDoAtivo("PETR4")).getByText("0")).toBeTruthy();
    expect(screen.getByText(/vendido 100 × petr4/i)).toBeTruthy();
  });

  it("fecha ao clicar no overlay (fora da caixa do modal)", () => {
    renderRebalanceamento();
    abrirModalManual("ITUB3");
    fireEvent.click(document.querySelector(".modal-overlay"));
    expect(document.querySelector(".modal-caixa")).toBeNull();
  });

  it("fecha ao pressionar Escape, sem alterar a posição do ativo", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("ITUB3");
    fireEvent.change(getInputQtd(modal), { target: { value: "5" } });

    fireEvent.keyDown(modal, { key: "Escape" });

    expect(document.querySelector(".modal-caixa")).toBeNull();
    expect(within(linhaDoAtivo("ITUB3")).getByText("1")).toBeTruthy();
  });

  it("clicar dentro da caixa do modal não propaga para o overlay e não fecha o modal", () => {
    renderRebalanceamento();
    const modal = abrirModalManual("ITUB3");
    fireEvent.click(modal);
    expect(document.querySelector(".modal-caixa")).toBeTruthy();
  });
});
