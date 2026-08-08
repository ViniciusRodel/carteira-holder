// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThOrdenavel from "./ThOrdenavel";

function renderTh(props) {
  return render(
    <table>
      <thead>
        <tr>
          <ThOrdenavel {...props}>Coluna</ThOrdenavel>
        </tr>
      </thead>
    </table>
  );
}

describe("ThOrdenavel", () => {
  it("renderiza o conteúdo e a seta neutra quando a coluna não está ativa", () => {
    renderTh({ campo: "codigo", ordenacao: { campo: "outro", direcao: "desc" }, onOrdenar: vi.fn() });
    expect(screen.getByText("Coluna")).toBeTruthy();
    expect(screen.getByText("↕")).toBeTruthy();
  });

  it("renderiza seta para baixo quando a coluna está ativa e a direção é desc", () => {
    renderTh({ campo: "codigo", ordenacao: { campo: "codigo", direcao: "desc" }, onOrdenar: vi.fn() });
    expect(screen.getByText("↓")).toBeTruthy();
  });

  it("renderiza seta para cima quando a coluna está ativa e a direção é asc", () => {
    renderTh({ campo: "codigo", ordenacao: { campo: "codigo", direcao: "asc" }, onOrdenar: vi.fn() });
    expect(screen.getByText("↑")).toBeTruthy();
  });

  it("aplica a classe de destaque apenas quando a coluna está ativa", () => {
    const { container: inativo } = renderTh({ campo: "codigo", ordenacao: { campo: "outro", direcao: "desc" }, onOrdenar: vi.fn() });
    expect(inativo.querySelector("th").className).not.toContain("th-ordenavel--ativo");

    const { container: ativo } = renderTh({ campo: "codigo", ordenacao: { campo: "codigo", direcao: "desc" }, onOrdenar: vi.fn() });
    expect(ativo.querySelector("th").className).toContain("th-ordenavel--ativo");
  });

  it("chama onOrdenar com o campo ao clicar, mesmo que a coluna já esteja ativa", () => {
    const onOrdenar = vi.fn();
    renderTh({ campo: "cotacao", ordenacao: { campo: "cotacao", direcao: "asc" }, onOrdenar });
    fireEvent.click(screen.getByText("Coluna"));
    expect(onOrdenar).toHaveBeenCalledTimes(1);
    expect(onOrdenar).toHaveBeenCalledWith("cotacao");
  });

  it("expõe o tooltip via atributo title do <th>", () => {
    const { container } = renderTh({
      campo: "pctMeta",
      ordenacao: { campo: null, direcao: "desc" },
      onOrdenar: vi.fn(),
      tooltip: "Percentual alvo do ativo na carteira",
    });
    expect(container.querySelector("th").getAttribute("title")).toBe("Percentual alvo do ativo na carteira");
  });
});
