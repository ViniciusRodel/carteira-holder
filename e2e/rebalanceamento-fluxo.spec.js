import { test, expect } from "@playwright/test";

// Caminho de ouro do app: a partir da carteira de exemplo (seed), configurar
// um aporte, comprar a sugestão de rebalanceamento e ver a operação refletida
// tanto na posição do ativo quanto no Histórico.
test.describe("Fluxo completo: aporte -> compra sugerida -> Histórico", () => {
  test("comprar a sugestão de rebalanceamento atualiza a posição e gera o registro correspondente no histórico", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Rebalanceamento" }).click();
    await expect(page).toHaveURL(/#\/rebalanceamento$/);

    await page.locator("input.input-aporte").fill("10000");

    const linhaComDeficit = page
      .locator("table.tabela--rebal tbody tr")
      .filter({ has: page.locator(".rebal-op-btn--comprar:not([disabled])") })
      .first();
    await expect(linhaComDeficit).toBeVisible();

    const codigo = await linhaComDeficit.getAttribute("data-codigo");
    const qtdSugeridaTexto = await linhaComDeficit.locator("td").nth(9).innerText(); // coluna "Qtd. sug."
    const qtdSugerida = parseInt(qtdSugeridaTexto.replace(/\D/g, ""), 10);
    const quantidadeAntes = paraNumero(await linhaComDeficit.locator("td").nth(3).innerText()); // coluna "Qtd."

    await linhaComDeficit.locator(".rebal-op-btn--comprar").click();

    await expect(page.locator(".toast").first()).toContainText(`Comprado ${qtdSugerida} × ${codigo}`);

    const quantidadeDepois = paraNumero(await page.locator(`tr[data-codigo="${codigo}"] td`).nth(3).innerText());
    expect(quantidadeDepois).toBeCloseTo(quantidadeAntes + qtdSugerida, 5);

    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(page).toHaveURL(/#\/historico$/);

    const linhaHistorico = page.locator(`tbody tr[data-codigo="${codigo}"][data-tipo="compra"]`).first();
    await expect(linhaHistorico).toBeVisible();
    await expect(linhaHistorico.locator("td.codigo-ativo")).toHaveText(codigo);
  });
});

function paraNumero(textoFormatadoPtBr) {
  return parseFloat(textoFormatadoPtBr.trim().replace(/\./g, "").replace(",", "."));
}
