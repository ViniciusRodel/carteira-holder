// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toggle from "./Toggle";

describe("Toggle", () => {
  it("expõe role switch e aria-checked de acordo com a prop ligado", () => {
    render(<Toggle ligado={true} onChange={vi.fn()} ariaLabel="Incluir X" />);
    const botao = screen.getByRole("switch", { name: "Incluir X" });
    expect(botao.getAttribute("aria-checked")).toBe("true");
    expect(botao.getAttribute("data-on")).toBe("true");
  });

  it("chama onChange(false) ao clicar quando está ligado", () => {
    const onChange = vi.fn();
    render(<Toggle ligado={true} onChange={onChange} ariaLabel="Incluir X" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("chama onChange(true) ao clicar quando está desligado", () => {
    const onChange = vi.fn();
    render(<Toggle ligado={false} onChange={onChange} ariaLabel="Incluir X" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("não gerencia o próprio estado — o valor de aria-checked só muda se o pai repassar uma nova prop", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle ligado={false} onChange={onChange} ariaLabel="Incluir X" />);
    fireEvent.click(screen.getByRole("switch"));
    // controlado: sem re-render com nova prop, continua refletindo o valor antigo
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    rerender(<Toggle ligado={true} onChange={onChange} ariaLabel="Incluir X" />);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });
});
