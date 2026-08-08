// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CampoEdicaoInline from "./CampoEdicaoInline";
import { formatarMoeda } from "../lib/formato";

const LABEL = "Cotação de TESTE3 em reais";

function campo() {
  return screen.getByLabelText(LABEL);
}

describe("CampoEdicaoInline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exibe o valor formatado como moeda quando não está em edição", () => {
    render(<CampoEdicaoInline valor={42.5} ariaLabel={LABEL} onCommit={vi.fn()} />);
    expect(campo().value).toBe(formatarMoeda(42.5));
    expect(campo().readOnly).toBe(true);
  });

  it("ao focar, troca para um input numérico editável com o valor selecionado", () => {
    render(<CampoEdicaoInline valor={42.5} ariaLabel={LABEL} onCommit={vi.fn()} />);
    fireEvent.focus(campo());
    expect(campo().type).toBe("number");
    expect(campo().value).toBe("42.5");
  });

  it("confirma um novo valor válido ao perder o foco e chama onCommit", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={42.5} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "50" } });
    fireEvent.blur(campo());
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).toHaveBeenCalledWith(50);
  });

  it("Enter confirma o valor digitado sem esperar o blur manual", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "15" } });
    fireEvent.keyDown(campo(), { key: "Enter" });
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).toHaveBeenCalledWith(15);
  });

  it("Esc cancela a edição, mantém o valor original e não chama onCommit", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "999" } });
    fireEvent.keyDown(campo(), { key: "Escape" });
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).not.toHaveBeenCalled();
    expect(campo().value).toBe(formatarMoeda(10));
  });

  it("rejeita valor negativo, reverte para o último valor válido e não chama onCommit", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "-5" } });
    fireEvent.blur(campo());
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).not.toHaveBeenCalled();
    expect(campo().value).toBe(formatarMoeda(10));
  });

  it("rejeita entrada vazia/não numérica sem zerar o valor silenciosamente", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "" } });
    fireEvent.blur(campo());
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).not.toHaveBeenCalled();
    expect(campo().value).toBe(formatarMoeda(10));
  });

  it("perder o foco sem alterar o valor não chama onCommit (evita ruído no histórico)", () => {
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.blur(campo());
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("avisa onEditingChange ao entrar e sair do modo de edição", () => {
    const onEditingChange = vi.fn();
    render(
      <CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={vi.fn()} onEditingChange={onEditingChange} />
    );
    fireEvent.focus(campo());
    expect(onEditingChange).toHaveBeenCalledWith(true);
    fireEvent.blur(campo());
    expect(onEditingChange).toHaveBeenCalledWith(false);
  });

  it("scroll do mouse sobre o campo focado tira o foco em vez de deixar o navegador incrementar o valor", () => {
    // jsdom não simula o incremento nativo do input[type=number] no wheel — o que
    // este teste garante é que onWheel sempre chama blur(), removendo o foco antes
    // que esse comportamento nativo (real em Chromium/WebView2) possa agir.
    const onCommit = vi.fn();
    render(<CampoEdicaoInline valor={10} ariaLabel={LABEL} onCommit={onCommit} />);
    fireEvent.focus(campo());
    fireEvent.change(campo(), { target: { value: "12" } });
    fireEvent.wheel(campo());
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).toHaveBeenCalledWith(12);
    expect(document.activeElement).not.toBe(campo());
  });
});
