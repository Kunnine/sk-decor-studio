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
import { customerApi } from "../api/customers";
import { saleApi, CreateSalePayload } from "../api/sales";
import { Product, Customer, CartItem, PaymentMethod, Sale } from "../types";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";

const STORAGE_KEY = "pos_cart_items";

export const Pos: React.FC = () => {
  const { user, settings } = useAuth();
  const queryClient = useQueryClient();

  const currencySymbol = settings?.currency_symbol || "$";
  const taxRate = parseFloat(String(settings?.tax_rate || "0"));
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State with localStorage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Query Products for POS
  const { data: searchProducts = [], isLoading: isSearching } = useQuery({
    queryKey: ["posProducts", searchTerm],
    queryFn: () => productApi.posSearch(searchTerm),
    staleTime: 5000,
  });

  // Query Customers for Autocomplete
  const { data: customerSearchResults = [] } = useQuery({
    queryKey: ["posCustomers", customerSearch],
    queryFn: () => customerApi.search(customerSearch),
    enabled: customerSearch.length > 0,
    staleTime: 5000,
  });

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.line_total, 0);

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

  // Add product to cart
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.qty : 0;

      if (currentQty >= product.stock_qty) {
        return prev;
      }

      const unitPrice = parseFloat(product.sell_price);
      if (existing) {
        const nextQty = existing.qty + 1;
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                qty: nextQty,
                line_total: Math.round(nextQty * unitPrice * 100) / 100,
              }
            : item,
        );
      } else {
        return [
          ...prev,
          {
            product,
            qty: 1,
            unit_price: unitPrice,
            line_total: unitPrice,
          },
        ];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const cappedQty = Math.min(newQty, item.product.stock_qty);
        return {
          ...item,
          qty: cappedQty,
          line_total: Math.round(cappedQty * item.unit_price * 100) / 100,
        };
      }),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
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
      queryClient.invalidateQueries({ queryKey: ["sales"] });
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
        qty: item.qty,
        unit_price: item.unit_price,
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
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* LEFT COLUMN: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product by name, SKU or scan barcode... (Press '/' to focus, Enter to add)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-16 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-transparent bg-white shadow-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              /
            </span>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-slate-100 animate-pulse rounded-lg border border-slate-200"
                />
              ))}
            </div>
          ) : searchProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 stroke-[1.5] text-slate-300 mb-2" />
              <p className="text-sm font-medium">No available products found</p>
              <p className="text-xs text-slate-400 mt-1">
                Try another search or scan a barcode
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {searchProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                const isOutOfStock = inCart && inCart.qty >= product.stock_qty;
                const isLowStock = product.stock_qty <= product.reorder_level;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={Boolean(isOutOfStock)}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      isOutOfStock
                        ? "opacity-40 border-slate-200 bg-slate-50 cursor-not-allowed"
                        : "border-slate-200 hover:border-[#4338CA] hover:bg-slate-50/50 cursor-pointer bg-white"
                    }`}
                  >
                    <div className="w-full h-24 mb-2 rounded bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
                      {product.thumb_url ? (
                        <img
                          src={product.thumb_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div
                      className="text-xs font-semibold text-slate-900 truncate"
                      title={product.name}
                    >
                      {product.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {product.sku}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-sm text-[#4338CA]">
                        {currencySymbol}
                        {parseFloat(product.sell_price).toFixed(2)}
                      </span>
                      <Badge
                        variant={isLowStock ? "warning" : "neutral"}
                        size="sm"
                      >
                        {product.stock_qty} left
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Cart & Checkout Panel */}
      <div className="w-full lg:w-[450px] flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#4338CA]" />
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
              Current Sale ({cart.reduce((sum, item) => sum + item.qty, 0)})
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium"
              title="Clear cart (Esc)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Customer Picker */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Customer
            </span>
            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="text-xs font-medium text-[#4338CA] hover:underline"
            >
              + Quick Add
            </button>
          </div>

          <div className="relative mt-1.5">
            {selectedCustomer ? (
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="font-semibold text-slate-900">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="text-slate-500 ml-2">
                      ({selectedCustomer.phone})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-400 hover:text-slate-700 ml-2 font-bold"
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
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                />
                {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {customerSearchResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-900">
                          {c.name}
                        </span>
                        <span className="text-slate-400">
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
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-slate-400">
                Scan or select items on the left
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {currencySymbol}
                    {item.unit_price.toFixed(2)} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.qty - 1)
                    }
                    className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.product.stock_qty}
                    value={item.qty}
                    onChange={(e) =>
                      updateQuantity(
                        item.product.id,
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-10 text-center text-xs font-semibold border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-[#4338CA]"
                  />
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.qty + 1)
                    }
                    disabled={item.qty >= item.product.stock_qty}
                    className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total & Remove */}
                <div className="w-20 text-right pl-3 flex items-center justify-end gap-2">
                  <span className="font-bold text-xs text-slate-900">
                    {currencySymbol}
                    {item.line_total.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-400 hover:text-slate-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout & Totals Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            {/* Discount Section (Manager/Admin Only) */}
            {isManagerOrAdmin && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  Discount:
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="text-xs bg-white border border-slate-300 rounded px-1.5 py-1 focus:ring-1 focus:ring-[#4338CA]"
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
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded text-right focus:ring-1 focus:ring-[#4338CA]"
                  />
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  {currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-amber-700">
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
                  <span className="font-semibold text-slate-900">
                    {currencySymbol}
                    {tax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900 uppercase">
                  Grand Total:
                </span>
                <span className="text-lg font-bold text-[#4338CA]">
                  {currencySymbol}
                  {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMethod === "cash"
                    ? "bg-white text-[#4338CA] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-white text-[#4338CA] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-white text-[#4338CA] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </button>
            </div>

            {/* Cash Payment Tender & Change Due */}
            {paymentMethod === "cash" && (
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Amount Paid:
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={total.toFixed(2)}
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 text-sm font-bold text-right border border-slate-300 rounded focus:ring-1 focus:ring-[#4338CA]"
                    />
                  </div>
                </div>

                {/* Quick cash suggestions */}
                <div className="flex items-center gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setQuickCash(0)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(10)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(20)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100"
                  >
                    +20
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(50)}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded hover:bg-slate-100"
                  >
                    +50
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs font-bold pt-1">
                  <span className="text-slate-600">Change Due:</span>
                  <span
                    className={
                      changeDue > 0
                        ? "text-[#4338CA] text-sm"
                        : "text-slate-500"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer Name <span className="text-amber-600">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Acme Corp or Sarah Connor"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <Input
              placeholder="e.g. +1 555-0100"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g. sarah@example.com"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#4338CA]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {currencySymbol}
                {completedSale.total}
              </div>
              <div className="text-sm font-semibold text-slate-600 mt-1">
                Invoice #{completedSale.invoice?.number}
              </div>
              {completedSale.customer && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Customer: {completedSale.customer.name}
                </div>
              )}
            </div>

            {completedSale.payment_method === "cash" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Amount Paid: </span>
                  <span className="font-semibold text-slate-800">
                    {currencySymbol}
                    {completedSale.amount_paid}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Change Due: </span>
                  <span className="font-bold text-[#4338CA]">
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
    </div>
  );
};
