import { test, expect } from "@playwright/test";

// A carteira de exemplo já fecha em 100% de meta (30+29+29+0+7+5). Este fluxo
// confirma que mexer num slider de classe reage em tempo real: soma exibida,
// cor/estado do badge de validação e o % individual da classe.
test.describe("Meta - Classes: validação da soma das metas em tempo real", () => {
  test("zerar uma classe via teclado quebra a soma de 100% e o badge alerta", async ({ page }) => {
    await page.goto("/#/meta-classes");

    const badge = page.locator(".badge-status");
    await expect(badge).toContainText("100.00%");
    await expect(badge).toContainText("OK");
    await expect(badge).toHaveClass(/badge-status--ok/);

    const linhaAcoes = page.locator(".slider-classe-linha").filter({ hasText: "Ações" });
    const slider = linhaAcoes.locator('input[type="range"]');

    await slider.focus();
    await slider.press("Home"); // desce direto para o mínimo (0), independentemente do valor atual

    await expect(linhaAcoes.locator(".slider-classe-valor")).toHaveText("0.00%");
    await expect(badge).toContainText("70.00%");
    await expect(badge).toContainText("ajuste para 100%");
    await expect(badge).toHaveClass(/badge-status--alerta/);
  });
});
