import { test, expect } from "@playwright/test";

test.describe("POS Product Stepper and Stock Preservation", () => {
  test("open a product, press + three times, confirm displayed stock is unchanged, add to cart, check out, and confirm stock decreased by exactly 3 after the sale", async ({
    page,
  }) => {
    // ------------------------------------------------------------------------
    // Step 1: Log in as Cashier
    // ------------------------------------------------------------------------
    await page.goto("/login");
    await expect(page).toHaveTitle(/Inventory/i);

    await page.click('button:has-text("Cashier")');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*(dashboard|pos)/);

    // ------------------------------------------------------------------------
    // Step 2: Navigate to POS
    // ------------------------------------------------------------------------
    await page.goto("/pos");
    await expect(page.locator("text=Point of Sale")).toBeVisible();

    // ------------------------------------------------------------------------
    // Step 3: Find a product with sufficient stock (at least 4 units)
    // ------------------------------------------------------------------------
    await page.waitForSelector('[data-testid="pos-product-card"]');
    const productCards = page.locator('[data-testid="pos-product-card"]');
    const cardCount = await productCards.count();
    expect(cardCount).toBeGreaterThan(0);

    let targetCard = productCards.first();
    let initialStock = 0;
    let found = false;

    for (let i = 0; i < cardCount; i++) {
      const card = productCards.nth(i);
      const stockElement = card.locator('[data-testid="product-stock"]');
      const text = await stockElement.innerText();
      const match = text.match(/\d+/);
      if (match) {
        const stock = parseInt(match[0], 10);
        if (stock >= 4) {
          targetCard = card;
          initialStock = stock;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      const text = await targetCard.locator('[data-testid="product-stock"]').innerText();
      initialStock = parseInt(text.match(/\d+/)?.[0] || "10", 10);
    }

    // ------------------------------------------------------------------------
    // Step 4: Open product detail card
    // ------------------------------------------------------------------------
    await targetCard.locator('[data-testid="open-product-detail"]').click();
    const detailModal = page.locator('[data-testid="pos-product-detail-card"]');
    await expect(detailModal).toBeVisible();

    // Verify initial stock display on the detail card
    const detailStock = detailModal.locator('[data-testid="detail-product-stock"]');
    await expect(detailStock).toHaveText(String(initialStock));

    // ------------------------------------------------------------------------
    // Step 5: Press + three times and confirm displayed stock is unchanged
    // ------------------------------------------------------------------------
    const plusButton = detailModal.locator('button[aria-label="Increase quantity"]');
    const stepperInput = detailModal.locator('input[aria-label="Quantity"]');

    // Stepper defaults to 1
    await expect(stepperInput).toHaveValue("1");

    // Press + first time (value becomes 2) -> confirm stock unchanged
    await plusButton.click();
    await expect(stepperInput).toHaveValue("2");
    await expect(detailStock).toHaveText(String(initialStock));

    // Press + second time (value becomes 3) -> confirm stock unchanged
    await plusButton.click();
    await expect(stepperInput).toHaveValue("3");
    await expect(detailStock).toHaveText(String(initialStock));

    // Press + third time (value becomes 4) -> confirm stock unchanged
    await plusButton.click();
    await expect(stepperInput).toHaveValue("4");
    await expect(detailStock).toHaveText(String(initialStock));

    // Step down to 3 to purchase exactly 3 units
    const minusButton = detailModal.locator('button[aria-label="Decrease quantity"]');
    await minusButton.click();
    await expect(stepperInput).toHaveValue("3");
    await expect(detailStock).toHaveText(String(initialStock));

    // Verify "Remaining after this sale" is accurately projected
    const remainingStock = detailModal.locator('[data-testid="detail-remaining-stock"]');
    await expect(remainingStock).toContainText(String(initialStock - 3));
    await expect(detailStock).toHaveText(String(initialStock));

    // ------------------------------------------------------------------------
    // Step 6: Add to cart
    // ------------------------------------------------------------------------
    const addToCartButton = detailModal.locator('[data-testid="detail-add-to-cart-button"]');
    await addToCartButton.click();

    // Detail modal closes
    await expect(detailModal).not.toBeVisible();

    // Confirm displayed stock on the POS product card is STILL unchanged
    await expect(targetCard.locator('[data-testid="product-stock"]')).toHaveText(
      `In stock: ${initialStock}`
    );
    await expect(targetCard.locator('[data-testid="remaining-stock"]')).toContainText(
      String(initialStock - 3)
    );

    // ------------------------------------------------------------------------
    // Step 7: Check out
    // ------------------------------------------------------------------------
    const exactCashButton = page.locator('button:has-text("Exact")');
    if (await exactCashButton.isVisible()) {
      await exactCashButton.click();
    }

    const completeSaleButton = page.locator('button:has-text("Complete Sale")');
    await expect(completeSaleButton).toBeEnabled();
    await completeSaleButton.click();

    // ------------------------------------------------------------------------
    // Step 8: Confirm sale completed and start new sale
    // ------------------------------------------------------------------------
    const newSaleButton = page.locator('button:has-text("Start New Sale")');
    await expect(newSaleButton).toBeVisible();
    await newSaleButton.click();

    // ------------------------------------------------------------------------
    // Step 9: Confirm stock decreased by exactly 3 after the sale
    // ------------------------------------------------------------------------
    await expect(targetCard.locator('[data-testid="product-stock"]')).toHaveText(
      `In stock: ${initialStock - 3}`
    );
  });
});
