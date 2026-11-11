# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stepper_stock.spec.ts >> POS Product Stepper and Stock Preservation >> open a product, press + three times, confirm displayed stock is unchanged, add to cart, check out, and confirm stock decreased by exactly 3 after the sale
- Location: e2e\stepper_stock.spec.ts:4:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\USer\AppData\Local\ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```