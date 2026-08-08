// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CarteiraProvider } from "../lib/CarteiraContext";
import Historico from "./Historico";

const HISTORICO_SEED = [
  { codigo: "ITUB3", classe: "Ações", tipo: "compra", quantidade: 10, cotacao: 30, valor: 300, data: "2026-01-01T10:00:00.000Z" },
];

function seedComHistorico(historico = HISTORICO_SEED) {
  localStorage.setItem("carteira:ativos", "[]");
  localStorage.setItem("carteira:historico", JSON.stringify(historico));
}

function renderHistorico() {
  return render(
    <CarteiraProvider>
      <Historico />
    </CarteiraProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Historico — botão Limpar histórico (padrão de confirmação dupla)", () => {
  it("não exibe o botão de limpar quando não há histórico", () => {
    seedComHistorico([]);
    renderHistorico();
    expect(screen.queryByRole("button", { name: /limpar histórico/i })).toBeNull();
  });

  it("primeiro clique só pede confirmação — não apaga o histórico", () => {
    seedComHistorico();
    renderHistorico();

    fireEvent.click(screen.getByRole("button", { name: /limpar histórico/i }));

    expect(screen.getByText(/isso apaga todo o histórico\. confirma\?/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /confirmar limpeza/i })).toBeTruthy();
    // a linha da tabela ainda está lá — nada foi apagado no primeiro clique
    expect(screen.getByText("ITUB3")).toBeTruthy();
  });

  it("segundo clique confirma e apaga o histórico", () => {
    seedComHistorico();
    renderHistorico();

    fireEvent.click(screen.getByRole("button", { name: /limpar histórico/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar limpeza/i }));

    expect(screen.queryByText("ITUB3")).toBeNull();
    expect(screen.getByText(/nenhuma operação registrada/i)).toBeTruthy();
    // sem histórico, o botão de limpar some
    expect(screen.queryByRole("button", { name: /limpar histórico|confirmar limpeza/i })).toBeNull();
  });

  it("o onBlur reseta a confirmação após ~200ms, exigindo dois cliques de novo", async () => {
    seedComHistorico();
    renderHistorico();

    const botao = screen.getByRole("button", { name: /limpar histórico/i });
    fireEvent.click(botao);
    expect(screen.getByRole("button", { name: /confirmar limpeza/i })).toBeTruthy();

    fireEvent.blur(screen.getByRole("button", { name: /confirmar limpeza/i }));

    await waitFor(
      () => expect(screen.getByRole("button", { name: /limpar histórico/i })).toBeTruthy(),
      { timeout: 1000 }
    );
    // o histórico continua intacto — o blur só reseta o estado de confirmação, não apaga nada
    expect(screen.getByText("ITUB3")).toBeTruthy();
  });
});
