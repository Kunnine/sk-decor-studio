import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  Download,
  RotateCcw,
  User,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Percent,
  AlertCircle,
  Package,
} from "lucide-react";
import { productApi } from "../api/products";
import { categoryApi } from "../api/categories";
import { customerApi } from "../api/customers";
import { saleApi, CreateSalePayload } from "../api/sales";
import {
  Product,
  ProductVariant,
  Category,
  Customer,
  CartItem,
  PaymentMethod,
  Sale,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { PosProductCard } from "../components/pos/PosProductCard";
import { QuantityStepper } from "../components/ui/QuantityStepper";

const STORAGE_KEY = "pos_cart_items";

export const Pos: React.FC = () => {
  const { user, settings } = useAuth();
  const queryClient = useQueryClient();

  const currencySymbol = settings?.currency_symbol || "$";
  const taxRate = parseFloat(String(settings?.tax_rate || "0"));
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  // Search & Dynamic Category Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State with localStorage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((item) => item && item.product && item.qty > 0)
        : [];
    } catch {
      return [];
    }
  });
  const [cartSyncNotice, setCartSyncNotice] = useState<string | null>(null);
  const cartRef = useRef<CartItem[]>(cart);
  cartRef.current = cart;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  // Discount State (manager/admin only)
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");

  // Completed Sale Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Product Detail Card Modal State
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailVariantId, setDetailVariantId] = useState<number | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);

  // Auto-focus search input on mount and shortcut '/'
  useEffect(() => {
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        handleCheckoutTrigger();
      } else if (e.key === "Escape") {
        if (isNewCustomerModalOpen) {
          setIsNewCustomerModalOpen(false);
        } else if (completedSale) {
          handleNewSale();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Query DB category tree safely (returns [] in unit tests when categoryApi is unmocked)
  const { data: categoryTree = [] } = useQuery<Category[]>({
    queryKey: ["posCategoriesTree"],
    queryFn: async () => {
      try {
        if (typeof categoryApi?.tree !== "function") return [];
        const res = await categoryApi.tree();
        return res?.data || [];
      } catch {
        return [];
      }
    },
    retry: false,
    staleTime: 60000,
  });

  // Query Products for POS
  const {
    data: searchProducts = [],
    isLoading: isSearching,
    isSuccess: isSearchSuccess,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ["posProducts", searchTerm, selectedCategoryId],
    queryFn: () =>
      selectedCategoryId
        ? productApi.posSearch(searchTerm, selectedCategoryId)
        : productApi.posSearch(searchTerm),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Synchronize persisted cart & open detail modal with live backend prices/stock/active status
  useEffect(() => {
    if (!isSearchSuccess || isSearching) return;

    const liveById = new Map(searchProducts.map((p) => [p.id, p]));
    const isUnfilteredCatalog =
      searchTerm.trim() === "" && selectedCategoryId === "";

    if (detailProduct) {
      const liveDetail = liveById.get(detailProduct.id);
      if (liveDetail) {
        const variantChanged =
          (liveDetail.variants?.length ?? 0) !==
            (detailProduct.variants?.length ?? 0) ||
          (liveDetail.variants || []).some((v, idx) => {
            const prevV = detailProduct.variants?.[idx];
            return (
              !prevV ||
              v.id !== prevV.id ||
              v.sell_price !== prevV.sell_price ||
              v.stock_qty !== prevV.stock_qty ||
              v.is_active !== prevV.is_active
            );
          });
        if (
          liveDetail.name !== detailProduct.name ||
          liveDetail.sku !== detailProduct.sku ||
          liveDetail.sell_price !== detailProduct.sell_price ||
          liveDetail.stock_qty !== detailProduct.stock_qty ||
          liveDetail.description !== detailProduct.description ||
          (liveDetail.image_url ?? null) !==
            (detailProduct.image_url ?? null) ||
          (liveDetail.thumb_url ?? null) !==
            (detailProduct.thumb_url ?? null) ||
          variantChanged
        ) {
          setDetailProduct(liveDetail);
        }
      } else if (isUnfilteredCatalog) {
        setDetailProduct(null);
        setDetailVariantId(null);
      }
    }

    const prevCart = cartRef.current;
    if (prevCart.length === 0) return;

    let changed = false;
    const removedNames: string[] = [];
    const adjustedNames: string[] = [];
    const nextCart: CartItem[] = [];

    for (const item of prevCart) {
      const liveProduct = liveById.get(item.product.id);

      if (!liveProduct) {
        if (isUnfilteredCatalog) {
          changed = true;
          removedNames.push(item.product.name);
        } else {
          nextCart.push(item);
        }
        continue;
      }

      if (liveProduct.is_active === false) {
        changed = true;
        removedNames.push(liveProduct.name);
        continue;
      }

      let liveVariant: ProductVariant | null = null;
      let liveStock = liveProduct.stock_qty;
      let liveUnitPrice = parseFloat(String(liveProduct.sell_price));

      if (item.variant?.id) {
        const matchedVar = (liveProduct.variants || []).find(
          (v) => v.id === item.variant!.id,
        );
        if (
          !matchedVar ||
          matchedVar.is_active === false ||
          matchedVar.stock_qty <= 0
        ) {
          changed = true;
          removedNames.push(
            `${liveProduct.name} (${item.variant.label || item.variant.name || item.variant.sku})`,
          );
          continue;
        }
        liveVariant = matchedVar;
        liveStock = matchedVar.stock_qty;
        liveUnitPrice = parseFloat(String(matchedVar.sell_price));
      } else if (liveStock <= 0) {
        changed = true;
        removedNames.push(liveProduct.name);
        continue;
      }

      const nextQty = Math.min(item.qty, liveStock);
      const nextLineTotal = Math.round(nextQty * liveUnitPrice * 100) / 100;

      const productFieldsChanged =
        item.product.name !== liveProduct.name ||
        item.product.sku !== liveProduct.sku ||
        item.product.sell_price !== liveProduct.sell_price ||
        item.product.stock_qty !== liveProduct.stock_qty ||
        (item.product.image_url ?? null) !== (liveProduct.image_url ?? null) ||
        (item.product.thumb_url ?? null) !== (liveProduct.thumb_url ?? null);

      const variantFieldsChanged = Boolean(
        item.variant &&
        liveVariant &&
        (item.variant.sell_price !== liveVariant.sell_price ||
          item.variant.stock_qty !== liveVariant.stock_qty ||
          item.variant.is_active !== liveVariant.is_active),
      );

      const commercialChanged =
        item.unit_price !== liveUnitPrice || item.qty !== nextQty;

      if (
        commercialChanged ||
        item.line_total !== nextLineTotal ||
        productFieldsChanged ||
        variantFieldsChanged
      ) {
        changed = true;
        if (commercialChanged) {
          adjustedNames.push(liveProduct.name);
        }
        nextCart.push({
          product: liveProduct,
          variant: liveVariant,
          qty: nextQty,
          unit_price: liveUnitPrice,
          line_total: nextLineTotal,
        });
      } else {
        nextCart.push(item);
      }
    }

    if (changed) {
      setCart(nextCart);
      if (removedNames.length > 0 && adjustedNames.length > 0) {
        setCartSyncNotice(
          `Cart updated from Products: removed unavailable ${removedNames.join(", ")} and synced pricing/stock for ${adjustedNames.join(", ")}.`,
        );
      } else if (removedNames.length > 0) {
        setCartSyncNotice(
          `Removed unavailable or inactive item(s) from cart: ${removedNames.join(", ")}.`,
        );
      } else if (adjustedNames.length > 0) {
        setCartSyncNotice(
          `Synced updated price or available stock for: ${adjustedNames.join(", ")}.`,
        );
      }
    }
  }, [
    searchProducts,
    isSearchSuccess,
    isSearching,
    searchTerm,
    selectedCategoryId,
    detailProduct,
  ]);

  // Query Customers for Autocomplete
  const { data: customerSearchResults = [] } = useQuery({
    queryKey: ["posCustomers", customerSearch],
    queryFn: () => customerApi.search(customerSearch),
    enabled: customerSearch.length > 0,
    staleTime: 5000,
  });

  // Calculations
  const subtotal =
    Math.round(cart.reduce((acc, item) => acc + item.line_total, 0) * 100) /
    100;

  let discountAmount = 0;
  if (isManagerOrAdmin && discountValue > 0) {
    if (discountType === "percent") {
      discountAmount = Math.min(
        subtotal,
        Math.round(subtotal * (Math.min(100, discountValue) / 100) * 100) / 100,
      );
    } else {
      discountAmount = Math.min(subtotal, discountValue);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal - discountAmount + tax) * 100) / 100;

  const numericAmountPaid =
    paymentMethod === "cash" ? parseFloat(amountPaidInput) || 0 : total;

  const changeDue =
    paymentMethod === "cash"
      ? Math.max(0, Math.round((numericAmountPaid - total) * 100) / 100)
      : 0;
  const isCashSufficient =
    paymentMethod !== "cash" || numericAmountPaid >= total;

  const isSameCartLine = (
    item: CartItem,
    productId: number,
    variantId?: number | null,
  ) =>
    item.product.id === productId &&
    (item.variant?.id ?? null) === (variantId ?? null);

  const getCartLineKey = (item: CartItem) =>
    `${item.product.id}:${item.variant?.id ?? "default"}`;

  const getCartQty = (productId: number, variantId?: number | null) =>
    cart.find((item) => isSameCartLine(item, productId, variantId))?.qty || 0;

  const formatVariantDisplay = (variant?: ProductVariant | null): string => {
    if (!variant) return "";
    return (
      variant.label ||
      variant.name ||
      [variant.color, variant.size, variant.material, variant.style]
        .filter(Boolean)
        .join(" / ") ||
      variant.sku
    );
  };

  // Add product (and optional variant) to cart with specified quantity, merging lines and capping at stock
  const addToCart = (
    product: Product,
    quantityToAdd: number = 1,
    variant: ProductVariant | null = null,
  ) => {
    if (quantityToAdd <= 0) return;

    const activeVariant =
      variant ??
      (product.variants && product.variants.length > 0
        ? (product.variants.find(
            (v) => v.is_active !== false && v.stock_qty > 0,
          ) ?? product.variants[0])
        : null);
    const variantId = activeVariant?.id ?? null;

    setCart((prev) => {
      const existing = prev.find((item) =>
        isSameCartLine(item, product.id, variantId),
      );
      const currentQty = existing ? existing.qty : 0;
      const maxAvailable = activeVariant
        ? activeVariant.stock_qty
        : product.stock_qty;

      if (maxAvailable <= 0 || currentQty >= maxAvailable) {
        return prev;
      }

      const qtyToAddClamped = Math.min(
        quantityToAdd,
        maxAvailable - currentQty,
      );
      if (qtyToAddClamped <= 0) {
        return prev;
      }

      const unitPrice = activeVariant
        ? parseFloat(String(activeVariant.sell_price))
        : parseFloat(product.sell_price);

      if (existing) {
        const nextQty = existing.qty + qtyToAddClamped;
        return prev.map((item) =>
          isSameCartLine(item, product.id, variantId)
            ? {
                ...item,
                product,
                variant: activeVariant,
                qty: nextQty,
                unit_price: unitPrice,
                line_total: Math.round(nextQty * unitPrice * 100) / 100,
              }
            : item,
        );
      } else {
        return [
          ...prev,
          {
            product,
            variant: activeVariant,
            qty: qtyToAddClamped,
            unit_price: unitPrice,
            line_total: Math.round(qtyToAddClamped * unitPrice * 100) / 100,
          },
        ];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (
    productId: number,
    newQty: number,
    variantId: number | null = null,
  ) => {
    if (newQty <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (!isSameCartLine(item, productId, variantId)) return item;
        const maxStock = item.variant
          ? item.variant.stock_qty
          : item.product.stock_qty;
        const cappedQty = Math.min(newQty, maxStock);
        return {
          ...item,
          qty: cappedQty,
          line_total: Math.round(cappedQty * item.unit_price * 100) / 100,
        };
      }),
    );
  };

  const removeFromCart = (
    productId: number,
    variantId: number | null = null,
  ) => {
    setCart((prev) =>
      prev.filter((item) => !isSameCartLine(item, productId, variantId)),
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartSyncNotice(null);
    setDiscountValue(0);
    setAmountPaidInput("");
    setSelectedCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
    searchInputRef.current?.focus();
  };

  // Handle Enter key on product search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchProducts.length > 0) {
        addToCart(searchProducts[0]);
        setSearchTerm("");
      }
    }
  };

  // Quick cash buttons
  const setQuickCash = (extra: number) => {
    if (extra === 0) {
      setAmountPaidInput(total.toFixed(2));
    } else {
      const current = parseFloat(amountPaidInput) || total;
      setAmountPaidInput((current + extra).toFixed(2));
    }
  };

  // Sale Mutation
  const saleMutation = useMutation({
    mutationFn: (payload: {
      data: CreateSalePayload;
      idempotencyKey: string;
    }) => saleApi.create(payload.data, payload.idempotencyKey),
    onSuccess: (res) => {
      setCompletedSale(res.data);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["posProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.items?.[0] ||
        "Transaction failed to process";
      setCheckoutError(msg);
    },
  });

  const handleCheckoutTrigger = () => {
    if (cart.length === 0 || !isCashSufficient || saleMutation.isPending) {
      return;
    }

    setCheckoutError(null);

    const idempotencyKey = crypto.randomUUID();
    const payload: CreateSalePayload = {
      customer_id: selectedCustomer?.id ?? null,
      payment_method: paymentMethod,
      amount_paid: paymentMethod === "cash" ? numericAmountPaid : total,
      discount:
        isManagerOrAdmin && discountValue > 0
          ? { type: discountType, value: discountValue }
          : undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_variant_id: item.variant?.id ?? null,
        qty: item.qty,
      })),
    };

    saleMutation.mutate({ data: payload, idempotencyKey });
  };

  // Quick Customer Creation
  const createCustomerMutation = useMutation({
    mutationFn: () =>
      customerApi.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        email: newCustomerEmail.trim() || null,
      }),
    onSuccess: (res) => {
      setSelectedCustomer(res.data);
      setIsNewCustomerModalOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  // PDF actions
  const handleDownloadPdf = async (
    invoiceId: number,
    invoiceNumber: string,
  ) => {
    try {
      const blob = await saleApi.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert("Failed to download invoice PDF.");
    }
  };

  const handlePrintPdf = async (invoiceId: number) => {
    try {
      const blob = await saleApi.viewPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    } catch {
      alert("Failed to print invoice PDF.");
    }
  };

  const handleNewSale = () => {
    setCompletedSale(null);
    clearCart();
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-8rem)]">
      {/* LEFT COLUMN: Product Catalog & Fast Search */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#F8F6F2] rounded-xl border border-[#E8E3DA] overflow-hidden shadow-none">
        {/* Search & Dynamic Category Filter Header */}
        <div className="p-4 border-b border-[#E8E3DA] bg-white space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#88847D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search decor item, color, material, SKU... (Press '/' to focus, Enter to add)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-16 py-2.5 text-sm rounded-lg border border-[#DDD6CA] focus:outline-none focus:ring-2 focus:ring-[#795438] focus:border-transparent bg-[#F8F7F4] focus:bg-white text-[#292824] placeholder-[#88847D] shadow-none transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#88847D] bg-[#F3EDE6] border border-[#E2D9CE] px-1.5 py-0.5 rounded">
              /
            </span>
          </div>

          {categoryTree.length > 0 &&
            (() => {
              const activeParent = selectedCategoryId
                ? (categoryTree.find(
                    (c) =>
                      c.id === selectedCategoryId ||
                      c.children?.some((sub) => sub.id === selectedCategoryId),
                  ) ?? null)
                : null;

              return (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId("")}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                        selectedCategoryId === ""
                          ? "bg-[#795438] text-white border-[#795438]"
                          : "bg-white text-[#88847D] border-[#E8E3DA] hover:border-[#A58B6F] hover:text-[#292824]"
                      }`}
                    >
                      All Categories
                    </button>
                    {categoryTree.map((parent) => {
                      const isParentOrChildSelected =
                        selectedCategoryId === parent.id ||
                        activeParent?.id === parent.id;
                      return (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() =>
                            setSelectedCategoryId((prev) =>
                              prev === parent.id ? "" : parent.id,
                            )
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                            isParentOrChildSelected
                              ? "bg-[#795438] text-white border-[#795438]"
                              : "bg-white text-[#88847D] border-[#E8E3DA] hover:border-[#A58B6F] hover:text-[#292824]"
                          }`}
                        >
                          {parent.name}
                        </button>
                      );
                    })}
                  </div>

                  {activeParent?.children &&
                    activeParent.children.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pl-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(activeParent.id)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors ${
                            selectedCategoryId === activeParent.id
                              ? "bg-[#292824] text-white border-[#292824]"
                              : "bg-[#F8F7F4] text-[#88847D] border-[#E8E3DA] hover:text-[#292824] hover:border-[#A58B6F]"
                          }`}
                        >
                          All {activeParent.name}
                        </button>
                        {activeParent.children.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(sub.id)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors ${
                              selectedCategoryId === sub.id
                                ? "bg-[#292824] text-white border-[#292824]"
                                : "bg-[#F8F7F4] text-[#88847D] border-[#E8E3DA] hover:text-[#292824] hover:border-[#A58B6F]"
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })()}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#F8F6F2]">
          {isSearching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] bg-[#EFEAE2] animate-pulse rounded-[10px]"
                />
              ))}
            </div>
          ) : isSearchError ? (
            <div
              role="alert"
              className="h-full flex flex-col items-center justify-center text-center p-6"
            >
              <div className="w-11 h-11 rounded-full bg-white border border-[#E8E3DA] flex items-center justify-center text-[#795438] mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#292824]">
                Unable to load POS catalog
              </p>
              <p className="text-xs text-[#88847D] mt-1 max-w-sm">
                {(searchError as any)?.response?.data?.message ||
                  (searchError as Error)?.message ||
                  "A network or server error occurred while fetching active products."}
              </p>
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => refetchSearch()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : searchProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#88847D]">
              <Package className="w-12 h-12 stroke-[1.25] text-[#C8C1B6] mb-2" />
              <p className="text-sm font-medium text-[#292824]">
                No available products found
              </p>
              <p className="text-xs text-[#88847D] mt-1">
                Try another search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {searchProducts.map((product) => {
                const inCart = getCartQty(product.id, null);
                return (
                  <PosProductCard
                    key={product.id}
                    product={product}
                    currencySymbol={currencySymbol}
                    cartQty={inCart}
                    getCartQty={getCartQty}
                    onAddToCart={addToCart}
                    onOpenDetails={(p, variant) => {
                      setDetailProduct(p);
                      const activeVars = (p.variants || []).filter(
                        (v) => v.is_active !== false,
                      );
                      const initialVar =
                        variant ??
                        activeVars.find((v) => v.stock_qty > 0) ??
                        activeVars[0] ??
                        null;
                      setDetailVariantId(initialVar?.id ?? null);
                      setDetailQty(1);
                    }}
                    onUpdateCartQty={updateQuantity}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Cart & Checkout Panel */}
      <div className="w-full lg:w-[440px] min-h-0 flex flex-col bg-white rounded-xl border border-[#E8E3DA] overflow-hidden shadow-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#E8E3DA] flex items-center justify-between bg-[#F8F6F2]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#795438]" />
            <h2 className="font-bold text-[#292824] text-sm uppercase tracking-wide">
              Current Sale ({cart.reduce((sum, item) => sum + item.qty, 0)})
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-[#88847D] hover:text-[#292824] flex items-center gap-1 font-medium"
              title="Clear cart (Esc)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Customer Picker */}
        <div className="px-4 py-2.5 border-b border-[#E8E3DA] bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#88847D] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#A58B6F]" />
              Customer
            </span>
            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="text-xs font-medium text-[#795438] hover:underline"
            >
              + Quick Add
            </button>
          </div>

          <div className="relative mt-1.5">
            {selectedCustomer ? (
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg text-xs">
                <div>
                  <span className="font-semibold text-[#292824]">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-[#88847D] ml-2">
                      ({selectedCustomer.phone})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-[#88847D] hover:text-[#292824] ml-2 font-bold"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Walk-in Customer (type to search existing...)"
                  value={customerSearch}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#DDD6CA] text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
                />
                {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E8E3DA] rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto divide-y divide-[#F0ECE4]">
                    {customerSearchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#F8F6F2] flex items-center justify-between"
                      >
                        <span className="font-medium text-[#292824]">
                          {c.name}
                        </span>
                        <span className="text-[#88847D]">
                          {c.phone || c.email || ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartSyncNotice && (
            <div
              role="status"
              className="p-2.5 bg-[#F8F6F2] border border-[#DDD6CA] rounded-lg text-xs text-[#292824] flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#795438] shrink-0 mt-0.5" />
                <span>{cartSyncNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setCartSyncNotice(null)}
                aria-label="Dismiss cart sync notice"
                className="text-[#88847D] hover:text-[#292824] text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>
          )}
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#88847D]">
              <ShoppingCart className="w-10 h-10 stroke-[1.25] text-[#CFC8BC] mb-2" />
              <p className="text-sm font-medium text-[#292824]">
                Cart is empty
              </p>
              <p className="text-xs text-[#88847D]">
                Use (+) on products on the left to add items
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineStock = item.variant
                ? item.variant.stock_qty
                : item.product.stock_qty;
              const lineVariantId = item.variant?.id ?? null;
              const variantText = formatVariantDisplay(item.variant);
              const thumbSrc =
                item.product.thumb_url || item.product.image_url || "";

              return (
                <div
                  key={getCartLineKey(item)}
                  data-testid="cart-item"
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-[#E8E3DA] bg-white"
                >
                  <div className="w-10 h-12 rounded-md border border-[#E8E3DA] bg-[#F8F6F2] flex items-center justify-center overflow-hidden shrink-0">
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-[#C8C1B6] stroke-[1.25]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#292824] truncate">
                      {item.product.name}
                    </div>
                    {variantText && (
                      <div className="text-[10px] font-medium text-[#795438] truncate">
                        {variantText}
                      </div>
                    )}
                    <div className="text-[10px] text-[#88847D] font-mono">
                      {currencySymbol}
                      {item.unit_price.toFixed(2)} each
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${item.product.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.qty - 1,
                          lineVariantId,
                        )
                      }
                      className="p-1 rounded border border-[#E8E3DA] bg-[#F8F6F2] text-[#795438] hover:bg-[#EFE8DE] transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={lineStock}
                      aria-label={`Quantity for ${item.product.name}`}
                      value={item.qty}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") return;
                        const parsed = parseInt(raw, 10);
                        if (Number.isNaN(parsed) || parsed < 0) return;
                        updateQuantity(item.product.id, parsed, lineVariantId);
                      }}
                      className="w-9 text-center text-xs font-semibold border border-[#E8E3DA] rounded py-0.5 text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
                    />
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${item.product.name}`}
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.qty + 1,
                          lineVariantId,
                        )
                      }
                      disabled={item.qty >= lineStock}
                      className="p-1 rounded border border-[#795438] bg-[#795438] text-[#F8F6F2] hover:bg-[#63432B] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="w-20 text-right pl-1 flex items-center justify-end gap-1.5 shrink-0">
                    <span className="font-bold text-xs text-[#292824] tabular-nums">
                      {currencySymbol}
                      {item.line_total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.product.name}`}
                      onClick={() =>
                        removeFromCart(item.product.id, lineVariantId)
                      }
                      className="text-[#88847D] hover:text-[#795438] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout & Totals Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-[#E8E3DA] bg-[#F8F6F2] space-y-3">
            {/* Discount Section (Manager/Admin Only) */}
            {isManagerOrAdmin && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#88847D] font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-[#A58B6F]" />
                  Discount:
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="text-xs bg-white border border-[#DDD6CA] rounded px-1.5 py-1 text-[#292824] focus:ring-1 focus:ring-[#795438]"
                  >
                    <option value="amount">{currencySymbol}</option>
                    <option value="percent">%</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue || ""}
                    onChange={(e) =>
                      setDiscountValue(
                        Math.max(0, parseFloat(e.target.value) || 0),
                      )
                    }
                    className="w-20 px-2 py-1 text-xs border border-[#DDD6CA] bg-white text-[#292824] rounded text-right focus:ring-1 focus:ring-[#795438]"
                  />
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-[#88847D]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#292824]">
                  {currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#B45309]">
                  <span>Discount:</span>
                  <span className="font-semibold">
                    -{currencySymbol}
                    {discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span className="font-semibold text-[#292824]">
                    {currencySymbol}
                    {tax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-[#E8E3DA]">
                <span className="text-sm font-bold text-[#292824] uppercase">
                  Grand Total:
                </span>
                <span className="text-lg font-bold text-[#795438]">
                  {currencySymbol}
                  {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAE3D7] rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "cash"
                    ? "bg-white text-[#795438] shadow-sm"
                    : "text-[#6D6861] hover:text-[#292824]"
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "card"
                    ? "bg-white text-[#795438] shadow-sm"
                    : "text-[#6D6861] hover:text-[#292824]"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "transfer"
                    ? "bg-white text-[#795438] shadow-sm"
                    : "text-[#6D6861] hover:text-[#292824]"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </button>
            </div>

            {/* Cash Payment Tender & Change Due */}
            {paymentMethod === "cash" && (
              <div className="space-y-2 pt-1 border-t border-[#E8E3DA]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#292824]">
                    Amount Paid:
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#88847D] font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={total.toFixed(2)}
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 text-sm font-bold text-right border border-[#DDD6CA] bg-white text-[#292824] rounded focus:ring-1 focus:ring-[#795438]"
                    />
                  </div>
                </div>

                {/* Quick cash suggestions */}
                <div className="flex items-center gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setQuickCash(0)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#DDD6CA] text-[#292824] rounded hover:bg-[#F3EDE6]"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(10)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#DDD6CA] text-[#292824] rounded hover:bg-[#F3EDE6]"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(20)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#DDD6CA] text-[#292824] rounded hover:bg-[#F3EDE6]"
                  >
                    +20
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(50)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#DDD6CA] text-[#292824] rounded hover:bg-[#F3EDE6]"
                  >
                    +50
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-1">
                  <span className="text-[#88847D]">Change Due:</span>
                  <span
                    className={
                      changeDue > 0
                        ? "text-[#795438] text-sm"
                        : "text-[#88847D]"
                    }
                  >
                    {currencySymbol}
                    {changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {checkoutError && (
              <div className="p-2.5 bg-[#FEF3C7] border border-amber-300 rounded-lg text-amber-900 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Complete Sale Button */}
            <Button
              type="button"
              className="w-full font-bold py-3 text-base shadow-none"
              onClick={handleCheckoutTrigger}
              disabled={
                !isCashSufficient || cart.length === 0 || saleMutation.isPending
              }
              isLoading={saleMutation.isPending}
            >
              Complete Sale (F2)
            </Button>
          </div>
        )}
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Quick Add Customer"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createCustomerMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#292824] uppercase tracking-wider mb-1">
              Customer Name <span className="text-amber-600">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Clara Vance or Atelier Home Studio"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292824] uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <Input
              placeholder="e.g. +1 555-0100"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#292824] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g. sarah@example.com"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E3DA]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewCustomerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createCustomerMutation.isPending}>
              Save & Select
            </Button>
          </div>
        </form>
      </Modal>

      {/* POST-CHECKOUT SUCCESS MODAL */}
      {completedSale && (
        <Modal
          isOpen={Boolean(completedSale)}
          onClose={handleNewSale}
          title="Sale Completed Successfully"
        >
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F3EDE6] flex items-center justify-center mx-auto text-[#795438]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="text-2xl font-black text-[#292824] tracking-tight">
                {currencySymbol}
                {completedSale.total}
              </div>
              <div className="text-sm font-semibold text-[#88847D] mt-1">
                Invoice #{completedSale.invoice?.number}
              </div>
              {completedSale.customer && (
                <div className="text-xs text-[#88847D] mt-0.5">
                  Customer: {completedSale.customer.name}
                </div>
              )}
            </div>

            {completedSale.payment_method === "cash" && (
              <div className="p-3 bg-[#F8F6F2] border border-[#E8E3DA] rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#88847D]">Amount Paid: </span>
                  <span className="font-semibold text-[#292824]">
                    {currencySymbol}
                    {completedSale.amount_paid}
                  </span>
                </div>
                <div>
                  <span className="text-[#88847D]">Change Due: </span>
                  <span className="font-bold text-[#795438]">
                    {currencySymbol}
                    {completedSale.change_due}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() =>
                  completedSale.invoice &&
                  handlePrintPdf(completedSale.invoice.id)
                }
              >
                Print Receipt
              </Button>
              <Button
                variant="outline"
                className="w-full"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() =>
                  completedSale.invoice &&
                  handleDownloadPdf(
                    completedSale.invoice.id,
                    completedSale.invoice.number,
                  )
                }
              >
                Download PDF
              </Button>
            </div>

            <Button
              className="w-full font-bold py-2.5 mt-2 shadow-none"
              onClick={handleNewSale}
            >
              Start New Sale (Esc)
            </Button>
          </div>
        </Modal>
      )}

      {/* Product Detail Card Modal */}
      {detailProduct && (
        <Modal
          isOpen={Boolean(detailProduct)}
          onClose={() => {
            setDetailProduct(null);
            setDetailVariantId(null);
          }}
          title={detailProduct.name}
          description={`SKU: ${detailProduct.sku}`}
          maxWidth="lg"
        >
          {(() => {
            const variantsList = (detailProduct.variants || []).filter(
              (v) => v.is_active !== false,
            );
            const hasVariants = variantsList.length > 0;
            const activeVariant = hasVariants
              ? (variantsList.find((v) => v.id === detailVariantId) ??
                variantsList[0] ??
                null)
              : null;

            const effectiveStock = activeVariant
              ? activeVariant.stock_qty
              : detailProduct.stock_qty;
            const effectivePrice = activeVariant
              ? parseFloat(String(activeVariant.sell_price))
              : parseFloat(detailProduct.sell_price);
            const effectiveSku = activeVariant
              ? activeVariant.sku
              : detailProduct.sku;

            const inCart = getCartQty(
              detailProduct.id,
              activeVariant?.id ?? null,
            );
            const maxAvailable = Math.max(0, effectiveStock - inCart);
            const isOutOfStock = maxAvailable === 0;
            const remaining = Math.max(0, effectiveStock - inCart - detailQty);
            const isAtMax = maxAvailable > 0 && detailQty >= maxAvailable;

            const attrBadges = [
              activeVariant?.color ?? detailProduct.color,
              activeVariant?.size ?? detailProduct.size,
              activeVariant?.material ?? detailProduct.material,
              activeVariant?.style ?? detailProduct.style,
            ].filter(Boolean);

            const handleAddFromDetail = () => {
              if (isOutOfStock) return;
              addToCart(detailProduct, detailQty, activeVariant);
              setDetailQty(1);
              setDetailProduct(null);
              setDetailVariantId(null);
            };

            return (
              <div className="space-y-4" data-testid="pos-product-detail-card">
                {/* Product Image & Basic Info Card */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-[#F8F6F2] rounded-xl border border-[#E8E3DA] items-center sm:items-start">
                  <div className="w-24 aspect-[4/5] rounded-lg bg-[#FFFFFF] flex items-center justify-center overflow-hidden shrink-0 border border-[#E8E3DA]">
                    {detailProduct.image_url || detailProduct.thumb_url ? (
                      <img
                        src={
                          detailProduct.image_url ||
                          detailProduct.thumb_url ||
                          ""
                        }
                        alt={detailProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-[#C8C1B6] stroke-[1.25]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h4
                      className="text-sm font-semibold text-[#292824] truncate"
                      title={detailProduct.name}
                    >
                      {detailProduct.name}
                    </h4>
                    <p className="text-xs font-mono text-[#88847D] mt-0.5">
                      SKU: {effectiveSku}
                    </p>
                    {detailProduct.category && (
                      <p className="text-[11px] text-[#88847D] mt-0.5">
                        {detailProduct.parent_category
                          ? `${detailProduct.parent_category.name} > `
                          : detailProduct.category.parent
                            ? `${detailProduct.category.parent.name} > `
                            : ""}
                        {detailProduct.category.name}
                      </p>
                    )}
                    {attrBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center sm:justify-start mt-1.5">
                        {attrBadges.map((attr, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-white border border-[#E8E3DA] text-[#88847D]"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-[#88847D] mt-2 line-clamp-2">
                      {detailProduct.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Variation Selection Pills */}
                {hasVariants && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#88847D] block mb-1.5">
                      Select Option / Variation
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {variantsList.map((variant) => {
                        const isSelected = activeVariant?.id === variant.id;
                        const isVarOut = variant.stock_qty <= 0;
                        return (
                          <button
                            key={variant.id || variant.sku}
                            type="button"
                            onClick={() => {
                              setDetailVariantId(variant.id ?? null);
                              setDetailQty(1);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              isSelected
                                ? "bg-[#795438] text-white border-[#795438] font-semibold"
                                : isVarOut
                                  ? "bg-[#F8F6F2] text-[#88847D]/60 border-[#E8E3DA] line-through"
                                  : "bg-white text-[#292824] border-[#DDD6CA] hover:border-[#A58B6F]"
                            }`}
                          >
                            {formatVariantDisplay(variant)} ({variant.stock_qty}{" "}
                            avail.)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pricing & Stock Stats */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8F6F2] rounded-lg border border-[#E8E3DA]">
                  <div>
                    <span className="text-[11px] text-[#88847D] block">
                      Unit Retail Price
                    </span>
                    <span className="text-lg font-bold text-[#795438] font-mono">
                      {currencySymbol}
                      {effectivePrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#88847D] block">
                      In stock
                    </span>
                    <span
                      data-testid="detail-product-stock"
                      className="text-lg font-bold text-[#292824] font-mono"
                    >
                      {effectiveStock}
                    </span>
                  </div>
                </div>

                {/* Remaining after this sale & Warning line */}
                <div className="p-3 bg-white rounded-lg border border-[#E8E3DA] space-y-1">
                  <div
                    data-testid="detail-remaining-stock"
                    className="text-xs text-[#88847D]"
                  >
                    Remaining after this sale:{" "}
                    <span className="font-semibold text-[#292824] font-mono">
                      {remaining}
                    </span>
                  </div>
                  <div data-testid="detail-stock-status">
                    {effectiveStock === 0 || isOutOfStock ? (
                      <span className="text-xs font-semibold text-[#88847D]">
                        Out of stock
                      </span>
                    ) : isAtMax ? (
                      <span className="text-xs font-semibold text-[#B45309]">
                        Only {maxAvailable} available
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Stepper & Add to Cart Controls */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E8E3DA]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#292824]">
                      Quantity:
                    </span>
                    <QuantityStepper
                      value={detailQty}
                      min={1}
                      max={maxAvailable}
                      onChange={setDetailQty}
                      onEnter={handleAddFromDetail}
                      disabled={isOutOfStock}
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailProduct(null);
                        setDetailVariantId(null);
                      }}
                      className="min-h-[40px] h-10 px-4"
                    >
                      Cancel
                    </Button>
                    <button
                      type="button"
                      onClick={handleAddFromDetail}
                      disabled={isOutOfStock}
                      data-testid="detail-add-to-cart-button"
                      className="flex-1 sm:flex-none min-h-[40px] h-10 px-5 flex items-center justify-center gap-1.5 rounded-lg bg-[#795438] hover:bg-[#63432B] active:bg-[#523621] text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#795438] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to cart</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
