import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_TENANT_SLUG } from "./global-setup.js";

test.beforeEach(async ({ page }) => {
  await page.goto(`/${E2E_TENANT_SLUG}/login`);
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
});

test.describe("finance entries", () => {
  test("creating a manual entry makes it appear in the list, and deleting it removes it", async ({ page }) => {
    const description = `Despesa E2E ${Date.now()}`;

    await page.getByRole("link", { name: /financeiro/i }).first().click();
    await page.getByRole("button", { name: "Lançamento" }).click();

    await page.getByLabel("Descrição").fill(description);
    await page.getByLabel("Valor (R$)").fill("123,45");
    await page.getByRole("button", { name: /Salvar lançamento/ }).click();

    const row = page.getByText(description, { exact: true });
    await expect(row).toBeVisible();

    await page
      .getByRole("row")
      .filter({ hasText: description })
      .getByRole("button", { name: "Excluir lançamento" })
      .click();

    await page.getByLabel("Senha").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByText(description, { exact: true })).not.toBeVisible();
  });
});
