import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_TENANT_SLUG } from "./global-setup.js";

test.beforeEach(async ({ page }) => {
  await page.goto(`/${E2E_TENANT_SLUG}/login`);
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
});

test.describe("games", () => {
  test("creating a game with the required fields makes it show up in the agenda", async ({ page }) => {
    const location = `Campo E2E ${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    await page.goto(`/${E2E_TENANT_SLUG}/jogos?view=OPERACAO&subView=CADASTRO`);

    // Internal-match team names must be distinct; overwrite the defaults explicitly rather than
    // relying on them, since they're seeded from GroupSettings and could collide.
    await page.getByLabel(/^Mandante/).fill("Time A E2E");
    await page.getByLabel(/^Visitante/).fill("Time B E2E");
    await page.getByLabel(/Local\/endereço do jogo/).fill(location);
    await page.getByLabel(/^Data do jogo/).fill(today);
    await page.getByLabel(/^Hora/).fill("18:00");

    await page.getByRole("button", { name: "Salvar e continuar" }).click();

    await expect(page.getByRole("heading", { name: location })).toBeVisible();
  });
});
