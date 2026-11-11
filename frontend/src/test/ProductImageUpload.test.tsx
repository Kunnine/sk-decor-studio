import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Products } from "../pages/Products";
import { ToastProvider } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";
import { productApi } from "../api/products";

vi.mock("../api/products", () => ({
  productApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleActive: vi.fn(),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
  },
}));

vi.mock("../api/categories", () => ({
  categoryApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Electronics" },
        { id: 2, name: "Lighting", parent_id: null },
        {
          id: 3,
          name: "Table Lamps",
          parent_id: 2,
          parent: { id: 2, name: "Lighting" },
        },
        { id: 4, name: "Vases & Pottery", parent_id: null },
        {
          id: 5,
          name: "Ceramic Vases",
          parent_id: 4,
          parent: { id: 4, name: "Vases & Pottery" },
        },
      ],
    }),
  },
}));

vi.mock("../api/suppliers", () => ({
  supplierApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 10, name: "Lumiere Lighting Studio" },
        { id: 11, name: "TerraCraft Pottery" },
      ],
    }),
  },
}));

const mockProduct = {
  id: 42,
  sku: "SKU-IMG-999",
  name: "Pro Headphones",
  description: "Matte black acoustic studio finish",
  category_id: 3,
  parent_category: { id: 2, name: "Lighting" },
  category: {
    id: 3,
    name: "Table Lamps",
    parent_id: 2,
    parent: { id: 2, name: "Lighting" },
  },
  supplier_id: 10,
  supplier: { id: 10, name: "Lumiere Lighting Studio" },
  cost_price: "40.00",
  avg_cost: "40.00",
  sell_price: "89.99",
  stock_qty: 25,
  reorder_level: 5,
  is_active: true,
  is_low_stock: false,
  image_url:
    "http://localhost:8000/storage/products/2026/11/pro_headphones.webp",
  thumb_url:
    "http://localhost:8000/storage/products/2026/11/pro_headphones_thumb.webp",
  created_at: "2026-10-30T10:00:00Z",
  updated_at: "2026-10-30T10:00:00Z",
};

const mockAuthValue: any = {
  user: {
    id: 1,
    name: "Admin User",
    email: "admin@test.com",
    role: "admin",
  },
  token: "test-token",
  permissions: ["*"],
  settings: {
    business_name: "Test Store",
    currency_symbol: "$",
    tax_rate: 0.1,
  },
  isAuthenticated: true,
  isLoading: false,
  hasRole: () => true,
  hasPermission: () => true,
};

const renderProducts = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <ToastProvider>
            <Products />
          </ToastProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe("Product Image Management & Upload Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (productApi.list as any).mockResolvedValue({
      data: [mockProduct],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    });
  });

  it("opens Product Image modal when clicking the product thumbnail button", async () => {
    renderProducts();

    const listToggle = await screen.findByRole("button", { name: "List view" });
    fireEvent.click(listToggle);

    const thumbBtn = await screen.findByRole("button", {
      name: `Manage image for ${mockProduct.name}`,
    });
    expect(thumbBtn).toBeInTheDocument();

    fireEvent.click(thumbBtn);

    expect(await screen.findByText("Product Image")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Upload or change the catalog photo for ${mockProduct.name}`,
      ),
    ).toBeInTheDocument();
  });

  it("opens Product Image modal via action button and allows deleting existing image", async () => {
    (productApi.deleteImage as any).mockResolvedValue({
      message: "Product image deleted successfully",
      data: { ...mockProduct, image_url: null, thumb_url: null },
    });

    renderProducts();

    const listToggle = await screen.findByRole("button", { name: "List view" });
    fireEvent.click(listToggle);

    const manageBtn = await screen.findByTitle("Manage Product Image");
    fireEvent.click(manageBtn);

    const deleteBtn = await screen.findByRole("button", {
      name: /delete image/i,
    });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(productApi.deleteImage).toHaveBeenCalledWith(mockProduct.id);
    });
  });

  it("does nothing when clicking the grid card directly and opens Product Image modal only via explicit action menu", async () => {
    renderProducts();

    const card = await screen.findByTestId("catalog-product-card");
    expect(card).not.toHaveClass("cursor-pointer");

    // Clicking anywhere on the static card surface does nothing
    fireEvent.click(card);
    fireEvent.click(within(card).getByAltText(mockProduct.name));
    fireEvent.click(within(card).getByText(mockProduct.name));
    fireEvent.click(within(card).getByText("$89.99"));
    fireEvent.click(within(card).getByText("25 in stock"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Only the explicit action menu responds to clicks
    const menuBtn = within(card).getByRole("button", {
      name: `Product actions for ${mockProduct.name}`,
    });
    fireEvent.click(menuBtn);

    const manageImgItem = await within(card).findByRole("menuitem", {
      name: /manage product image/i,
    });
    fireEvent.click(manageImgItem);

    expect(await screen.findByText("Product Image")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Upload or change the catalog photo for ${mockProduct.name}`,
      ),
    ).toBeInTheDocument();
  });

  it("creates a product with an uploaded image in Create Product modal", async () => {
    (productApi.create as any).mockResolvedValue({
      message: "Product created successfully",
      data: mockProduct,
    });

    renderProducts();

    const addBtn = await screen.findByRole("button", { name: /add product/i });
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Add New Product")).toBeInTheDocument();

    // Fill required fields scoped to dialog
    fireEvent.change(within(dialog).getByLabelText(/sku \/ barcode/i), {
      target: { value: "NEW-SKU-001" },
    });
    fireEvent.change(within(dialog).getByLabelText(/product name/i), {
      target: { value: "New Studio Monitor" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^category/i), {
      target: { value: "1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/cost price/i), {
      target: { value: "120" },
    });
    fireEvent.change(within(dialog).getByLabelText(/retail sell price/i), {
      target: { value: "199.99" },
    });

    // Mock Image naturalWidth/naturalHeight for JSDOM image validation
    const originalImage = window.Image;
    window.Image = class {
      onload: () => void = () => {};
      naturalWidth = 400;
      naturalHeight = 400;
      set src(_: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    const fileInput = within(dialog).getByTestId("image-file-input");
    const testFile = new File(["dummy image bytes"], "monitor.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(
        within(dialog).getByText(/new image selected/i),
      ).toBeInTheDocument();
    });

    // Submit form
    const createSubmitBtn = within(dialog).getByRole("button", {
      name: /create product/i,
    });
    fireEvent.click(createSubmitBtn);

    await waitFor(() => {
      expect(productApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: "NEW-SKU-001",
          name: "New Studio Monitor",
          category_id: 1,
          cost_price: 120,
          sell_price: 199.99,
          image: testFile,
        }),
      );
    });

    window.Image = originalImage;
  });

  it("places image upload section at the top of Add Product form", async () => {
    renderProducts();

    const addBtn = await screen.findByRole("button", { name: /add product/i });
    fireEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    const imageSection = within(dialog).getByTestId(
      "product-form-image-section",
    );
    const nameInput = within(dialog).getByLabelText(/product name/i);

    expect(
      imageSection.compareDocumentPosition(nameInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("preloads product data in Edit Product modal, replaces image, saves without duplicating, and refreshes card", async () => {
    const updatedProduct = {
      ...mockProduct,
      name: "Sculpted Travertine Vase",
      sku: "VAS-TRV-88",
      description: "Handcrafted stone finish",
      category_id: 5,
      category: {
        id: 5,
        name: "Ceramic Vases",
        parent_id: 4,
        parent: { id: 4, name: "Vases & Pottery" },
      },
      supplier_id: 11,
      cost_price: "52.00",
      sell_price: "129.00",
      stock_qty: 14,
      image_url:
        "http://localhost:8000/storage/products/2026/11/travertine_vase.webp",
    };

    (productApi.list as any)
      .mockResolvedValueOnce({
        data: [mockProduct],
        meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      })
      .mockResolvedValueOnce({
        data: [updatedProduct],
        meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      });

    (productApi.update as any).mockResolvedValue({
      message: "Product updated successfully",
      data: updatedProduct,
    });

    renderProducts();

    const card = await screen.findByTestId("catalog-product-card");
    fireEvent.click(
      within(card).getByRole("button", {
        name: `Product actions for ${mockProduct.name}`,
      }),
    );
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "Edit Product" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Product")).toBeInTheDocument();

    // Verify existing product information and current image are preloaded
    expect(within(dialog).getByLabelText(/product name/i)).toHaveValue(
      "Pro Headphones",
    );
    expect(within(dialog).getByLabelText(/sku \/ barcode/i)).toHaveValue(
      "SKU-IMG-999",
    );
    expect(within(dialog).getByLabelText("Parent Category")).toHaveValue("2");
    expect(within(dialog).getByLabelText(/^category/i)).toHaveValue("3");
    expect(within(dialog).getByLabelText(/supplier/i)).toHaveValue("10");
    expect(within(dialog).getByLabelText(/description/i)).toHaveValue(
      "Matte black acoustic studio finish",
    );
    expect(within(dialog).getByLabelText(/cost price/i)).toHaveValue(40);
    expect(within(dialog).getByLabelText(/retail sell price/i)).toHaveValue(
      89.99,
    );
    const stockInput = within(dialog).getByLabelText(/stock quantity/i);
    expect(stockInput).toBeEnabled();
    expect(stockInput).toHaveValue(25);
    expect(within(dialog).getByAltText("Preview")).toHaveAttribute(
      "src",
      mockProduct.image_url,
    );

    // Update all fields including replacement image
    fireEvent.change(within(dialog).getByLabelText(/product name/i), {
      target: { value: "Sculpted Travertine Vase" },
    });
    fireEvent.change(within(dialog).getByLabelText(/sku \/ barcode/i), {
      target: { value: "VAS-TRV-88" },
    });
    fireEvent.change(within(dialog).getByLabelText("Parent Category"), {
      target: { value: "4" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^category/i), {
      target: { value: "5" },
    });
    fireEvent.change(within(dialog).getByLabelText(/supplier/i), {
      target: { value: "11" },
    });
    fireEvent.change(within(dialog).getByLabelText(/description/i), {
      target: { value: "Handcrafted stone finish" },
    });
    fireEvent.change(within(dialog).getByLabelText(/cost price/i), {
      target: { value: "52" },
    });
    fireEvent.change(within(dialog).getByLabelText(/retail sell price/i), {
      target: { value: "129" },
    });
    fireEvent.change(stockInput, { target: { value: "14" } });

    const originalImage = window.Image;
    window.Image = class {
      onload: () => void = () => {};
      naturalWidth = 500;
      naturalHeight = 500;
      set src(_: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    const replacementFile = new File(["new bytes"], "vase.jpg", {
      type: "image/jpeg",
    });
    fireEvent.change(within(dialog).getByTestId("image-file-input"), {
      target: { files: [replacementFile] },
    });

    await waitFor(() => {
      expect(
        within(dialog).getByText(/new image selected/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      within(dialog).getByRole("button", { name: /update product/i }),
    );

    await waitFor(() => {
      expect(productApi.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          sku: "VAS-TRV-88",
          name: "Sculpted Travertine Vase",
          description: "Handcrafted stone finish",
          category_id: 5,
          supplier_id: 11,
          cost_price: 52,
          sell_price: 129,
          stock_qty: 14,
          image: replacementFile,
          remove_image: false,
        }),
      );
      expect(productApi.create).not.toHaveBeenCalled();
    });

    // Card refreshes cleanly after saving
    expect(
      await screen.findByText("Sculpted Travertine Vase"),
    ).toBeInTheDocument();
    expect(screen.getByText("$129.00")).toBeInTheDocument();
    expect(screen.getByText("14 in stock")).toBeInTheDocument();

    window.Image = originalImage;
  });

  it("allows removing existing product image during Edit Product and refreshes card", async () => {
    const productWithoutImage = {
      ...mockProduct,
      image_url: null,
      thumb_url: null,
    };

    (productApi.list as any)
      .mockResolvedValueOnce({
        data: [mockProduct],
        meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      })
      .mockResolvedValueOnce({
        data: [productWithoutImage],
        meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 },
      });

    (productApi.update as any).mockResolvedValue({
      message: "Product updated",
      data: productWithoutImage,
    });

    renderProducts();

    const card = await screen.findByTestId("catalog-product-card");
    fireEvent.click(
      within(card).getByRole("button", {
        name: `Product actions for ${mockProduct.name}`,
      }),
    );
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "Edit Product" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByAltText("Preview")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(
      within(dialog).getByText(
        /existing image will be removed when you save changes/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: /update product/i }),
    );

    await waitFor(() => {
      expect(productApi.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          image: null,
          remove_image: true,
        }),
      );
    });

    await waitFor(() => {
      const updatedCard = screen.getByTestId("catalog-product-card");
      expect(
        within(updatedCard).queryByAltText(mockProduct.name),
      ).not.toBeInTheDocument();
    });
  });

  it("deletes product from three-dot menu via confirmation dialog", async () => {
    (productApi.delete as any).mockResolvedValue({
      message: "Product deleted",
    });

    renderProducts();

    const card = await screen.findByTestId("catalog-product-card");
    fireEvent.click(
      within(card).getByRole("button", {
        name: `Product actions for ${mockProduct.name}`,
      }),
    );
    fireEvent.click(
      await within(card).findByRole("menuitem", { name: "Delete Product" }),
    );

    const confirmDialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(confirmDialog).getByRole("button", { name: "Delete Product" }),
    );

    await waitFor(() => {
      expect(productApi.delete).toHaveBeenCalledWith(mockProduct.id);
    });
  });

  it("displays category, image, name, price, stock, and direct Edit and Delete buttons on cards while keeping card surface non-clickable", async () => {
    renderProducts();

    const card = await screen.findByTestId("catalog-product-card");
    expect(within(card).getByAltText(mockProduct.name)).toBeInTheDocument();
    expect(
      within(card).getByText("Lighting › Table Lamps"),
    ).toBeInTheDocument();
    expect(within(card).getByText(mockProduct.name)).toBeInTheDocument();
    expect(within(card).getByText("$89.99")).toBeInTheDocument();
    expect(within(card).getByText("25 in stock")).toBeInTheDocument();

    // Clicking category or card itself does not open modals or redirect
    fireEvent.click(within(card).getByText("Lighting › Table Lamps"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/");

    // Direct Edit button opens preloaded Edit Product modal
    fireEvent.click(
      within(card).getByRole("button", { name: `Edit ${mockProduct.name}` }),
    );
    const editDialog = await screen.findByRole("dialog");
    expect(within(editDialog).getByText("Edit Product")).toBeInTheDocument();
    expect(within(editDialog).getByLabelText(/product name/i)).toHaveValue(
      mockProduct.name,
    );
    fireEvent.click(within(editDialog).getByRole("button", { name: "Cancel" }));

    // Direct Delete button opens confirmation dialog without deleting immediately
    fireEvent.click(
      within(card).getByRole("button", { name: `Delete ${mockProduct.name}` }),
    );
    const confirmDialog = await screen.findByRole("dialog");
    expect(
      within(confirmDialog).getByRole("heading", { name: "Delete Product" }),
    ).toBeInTheDocument();
    expect(productApi.delete).not.toHaveBeenCalled();
  });

  it("supports search, pagination, page size changes, error recovery, and filtered empty reset", async () => {
    (productApi.list as any)
      .mockRejectedValueOnce(new Error("Network offline"))
      .mockResolvedValueOnce({
        data: [mockProduct],
        meta: {
          current_page: 1,
          from: 1,
          to: 12,
          last_page: 3,
          per_page: 12,
          total: 30,
        },
      })
      .mockResolvedValue({
        data: [],
        meta: {
          current_page: 2,
          from: 0,
          to: 0,
          last_page: 1,
          per_page: 24,
          total: 0,
        },
      });

    renderProducts();

    // Initial error state shows alert + Retry button
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("Unable to load products");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    // Loaded state shows database total + pagination controls
    expect(
      await screen.findByText("30 products in catalog"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

    await waitFor(() => {
      expect(productApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, per_page: 12 }),
      );
    });

    // Empty state after searching shows Clear Filters button
    fireEvent.change(screen.getByPlaceholderText("Search products or SKU..."), {
      target: { value: "NonExistentSku" },
    });

    expect(await screen.findByText("No products found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear Filters" }),
    ).toBeInTheDocument();
  });
});
