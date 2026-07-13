import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_TENANT_SLUG } from "./global-setup.js";

test.describe("login", () => {
  test("valid credentials redirect to the dashboard", async ({ page }) => {
    await page.goto(`/${E2E_TENANT_SLUG}/login`);
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Senha").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole("link", { name: /financeiro/i }).first()).toBeVisible();
  });

  test("invalid credentials show an error and stay on the login page", async ({ page }) => {
    await page.goto(`/${E2E_TENANT_SLUG}/login`);
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Senha").fill("senha-errada-de-proposito");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Credenciais inválidas")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${E2E_TENANT_SLUG}/login$`));
  });
});
