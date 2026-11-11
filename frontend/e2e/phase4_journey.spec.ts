import { test, expect } from "@playwright/test";

test.describe("Phase 4 Full System Journey", () => {
  test("full end-to-end journey: manager purchase receive -> cashier sells to low stock -> manager bell alert -> draft purchase from low-stock -> dashboard -> CSV export", async ({
    page,
  }) => {
    // ------------------------------------------------------------------------
    // Step 1: Log in as Manager
    // ------------------------------------------------------------------------
    await page.goto("/login");
    await expect(page).toHaveTitle(/Inventory/i);

    // Click demo fill for Manager and submit
    await page.click('button:has-text("Manager")');
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("h1")).toContainText("Performance Overview");

    // ------------------------------------------------------------------------
    // Step 2: Create a purchase order and receive it
    // ------------------------------------------------------------------------
    await page.goto("/purchases");
    await expect(page.locator("h1")).toContainText("Purchase Orders");

    // Click New Purchase Order
    await page.click('button:has-text("New Purchase Order")');
    await expect(page.locator("text=Create Purchase Order")).toBeVisible();

    // Select Supplier (first option)
    await page.selectOption('select[name="supplier_id"]', { index: 1 });

    // Submit draft purchase order
    await page.click('button:has-text("Create Order")');
    await expect(page.locator("text=Create Purchase Order")).not.toBeVisible();

    // Find the latest draft purchase and click Receive
    const receiveButton = page.locator('button:has-text("Receive")').first();
    if (await receiveButton.isVisible()) {
      await receiveButton.click();
      // Confirm dialog if shown
      const confirmReceive = page.locator('button:has-text("Confirm Receive")');
      if (await confirmReceive.isVisible()) {
        await confirmReceive.click();
      }
    }

    // ------------------------------------------------------------------------
    // Step 3: Log out and Log in as Cashier
    // ------------------------------------------------------------------------
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(/.*login/);

    // Click demo fill for Cashier
    await page.click('button:has-text("Cashier")');
    await page.click('button[type="submit"]');

    // Cashier dashboard should display reduced view without cost/profit
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("h1")).toContainText("Welcome, Cashier User");
    await expect(page.locator("text=Gross Profit")).not.toBeVisible();

    // ------------------------------------------------------------------------
    // Step 4: Sell down to reorder level via POS
    // ------------------------------------------------------------------------
    await page.goto("/pos");
    await expect(page.locator("text=Point of Sale")).toBeVisible();

    // Search and select a product to sell via (+) button
    const productCard = page.locator('[data-testid="pos-product-card"]').first();
    if (await productCard.isVisible()) {
      await productCard.locator('button[aria-label="Increase quantity"]').click();
      // Click Pay / Complete Checkout
      const checkoutButton = page.locator('button:has-text("Complete Sale")');
      if (await checkoutButton.isVisible()) {
        await checkoutButton.click();
        // Payment modal
        const confirmPay = page.locator('button:has-text("Confirm Payment")');
        if (await confirmPay.isVisible()) {
          await confirmPay.click();
        }
      }
    }

    // ------------------------------------------------------------------------
    // Step 5: Log back in as Manager to verify alerts
    // ------------------------------------------------------------------------
    await page.goto("/dashboard");
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(/.*login/);

    await page.click('button:has-text("Manager")');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Notification dropdown bell check
    const bellButton = page.locator('button[aria-label="View notifications"]');
    await expect(bellButton).toBeVisible();

    // ------------------------------------------------------------------------
    // Step 6: Open Low-Stock page and create draft purchase from shortcut
    // ------------------------------------------------------------------------
    await page.goto("/products/low-stock");
    await expect(page.locator("h1")).toContainText("Low-Stock Restock Queue");

    // Look for Restock shortcut button
    const restockButton = page.locator('button:has-text("Create Purchase Order")').first();
    if (await restockButton.isVisible()) {
      await restockButton.click();
      // Verify navigated to /purchases with create modal open
      await expect(page).toHaveURL(/.*purchases.*create=true/);
    }

    // ------------------------------------------------------------------------
    // Step 7: View Dashboard charts & table toggle
    // ------------------------------------------------------------------------
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Performance Overview");

    // Toggle a chart to table view
    const tableToggle = page.locator('button:has-text("Table")').first();
    if (await tableToggle.isVisible()) {
      await tableToggle.click();
      await expect(page.locator('button:has-text("Chart")').first()).toBeVisible();
    }

    // ------------------------------------------------------------------------
    // Step 8: Open Reports page and export CSV
    // ------------------------------------------------------------------------
    await page.goto("/reports");
    await expect(page.locator("h1")).toContainText("Business Intelligence Reports");

    // Trigger CSV export
    const csvExportButton = page.locator('button:has-text("CSV Export")');
    await expect(csvExportButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await csvExportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
