import { expect, test } from "@playwright/test";

test("renders the configured signup flow and switches every auth screen", async ({ page }) => {
  await page.goto("/preview");

  await expect(page.getByRole("heading", { name: "Create Customer Account" })).toBeVisible();
  await expect(page.getByLabel("Full Name *")).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("Email Address *")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Phone Number *")).toHaveAttribute("type", "tel");

  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Customer Login" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Verification", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify Your Account" })).toBeVisible();
  await expect(page.getByLabel("Verification Code *")).toHaveAttribute("inputmode", "numeric");

  await page.getByRole("button", { name: "Recovery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Recovery Instructions" })).toBeVisible();
});

test("exposes keyboard-usable preview navigation without horizontal overflow", async ({ page }) => {
  await page.goto("/preview");

  const navigation = page.getByRole("navigation", { name: "Authentication preview screen" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "Login" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Customer Login" })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("serves a stable health contract", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ok" });
});
