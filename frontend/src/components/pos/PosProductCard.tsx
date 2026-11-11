import React, { useState, useEffect } from "react";
import { Package, Minus, Plus, Eye } from "lucide-react";
import { Product, ProductVariant } from "../../types";

export interface PosProductCardProps {
  product: Product;
  currencySymbol: string;
  cartQty: number;
  getCartQty?: (productId: number, variantId?: number | null) => number;
  onAddToCart: (
    product: Product,
    qty: number,
    variant?: ProductVariant | null,
  ) => void;
  onOpenDetails: (product: Product, variant?: ProductVariant | null) => void;
  onUpdateCartQty?: (
    productId: number,
    newQty: number,
    variantId?: number | null,
  ) => void;
}

const formatVariantChipLabel = (variant: ProductVariant): string => {
  const parts = [variant.color, variant.size].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return variant.label || variant.name || variant.sku;
};

export const PosProductCard: React.FC<PosProductCardProps> = ({
  product,
  currencySymbol,
  cartQty,
  getCartQty,
  onAddToCart,
  onOpenDetails,
  onUpdateCartQty,
}) => {
  const variantsList = (product.variants || []).filter(
    (v) => v.is_active !== false,
  );
  const hasVariants = variantsList.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    () => {
      if (!hasVariants) return null;
      const firstInStock = variantsList.find((v) => v.stock_qty > 0);
      return firstInStock?.id ?? variantsList[0]?.id ?? null;
    },
  );

  useEffect(() => {
    if (!hasVariants) {
      if (selectedVariantId !== null) setSelectedVariantId(null);
      return;
    }
    const stillExists = variantsList.some((v) => v.id === selectedVariantId);
    if (!stillExists) {
      const firstInStock = variantsList.find((v) => v.stock_qty > 0);
      setSelectedVariantId(firstInStock?.id ?? variantsList[0]?.id ?? null);
    }
  }, [hasVariants, product.id, selectedVariantId, variantsList]);

  const activeVariant = hasVariants
    ? (variantsList.find((v) => v.id === selectedVariantId) ?? variantsList[0])
    : null;

  const effectiveStock = activeVariant
    ? activeVariant.stock_qty
    : product.stock_qty;
  const effectiveReorderLevel = activeVariant
    ? activeVariant.reorder_level
    : product.reorder_level;
  const effectivePrice = activeVariant
    ? parseFloat(String(activeVariant.sell_price))
    : parseFloat(product.sell_price);
  const effectiveCartQty = getCartQty
    ? getCartQty(product.id, activeVariant?.id ?? null)
    : cartQty;

  const isOutOfStock = effectiveStock <= 0;
  const isAtMax = effectiveCartQty >= effectiveStock;
  const remainingStock = Math.max(0, effectiveStock - effectiveCartQty);

  const handleIncrement = () => {
    if (isOutOfStock || isAtMax) return;
    onAddToCart(product, 1, activeVariant);
  };

  const handleDecrement = () => {
    if (effectiveCartQty <= 0) return;
    if (onUpdateCartQty) {
      onUpdateCartQty(
        product.id,
        effectiveCartQty - 1,
        activeVariant?.id ?? null,
      );
    }
  };

  return (
    <article
      data-testid="pos-product-card"
      data-product-id={product.id}
      className={`flex flex-col justify-between p-3.5 rounded-[10px] border bg-white ${
        isOutOfStock ? "border-[#E8E3DA]/70 opacity-65" : "border-[#E8E3DA]"
      }`}
    >
      {/* 1. Static 4:5 Product Image on Warm Ivory Backdrop (non-clickable) */}
      <div>
        <div className="relative w-full aspect-[4/5] rounded-lg bg-[#F8F6F2] flex items-center justify-center overflow-hidden group/img">
          {product.thumb_url || product.image_url ? (
            <img
              src={product.image_url || product.thumb_url || ""}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-8 h-8 text-[#C9C2B6] stroke-[1.25]" />
          )}

          {/* Subtle detail trigger shown on hover/focus to keep photography uncluttered */}
          <button
            type="button"
            onClick={() => onOpenDetails(product, activeVariant)}
            data-testid="open-product-detail"
            aria-label={`View details for ${product.name}`}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 hover:bg-white text-[#88847D] hover:text-[#795438] opacity-0 group-hover/img:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#795438]"
            title="Preview Product"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Product Name (non-clickable) */}
        <h3
          className="font-medium text-sm text-[#292824] leading-snug line-clamp-2 min-h-[2.5rem] mt-3"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Minimal variant chips only when product has active variations */}
        {hasVariants && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {variantsList.map((variant) => {
              const isSelected = activeVariant?.id === variant.id;
              const isVarOut = variant.stock_qty <= 0;
              return (
                <button
                  key={variant.id || variant.sku}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id ?? null)}
                  className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
                    isSelected
                      ? "bg-[#795438] text-[#F8F6F2] border-[#795438] font-medium"
                      : isVarOut
                        ? "bg-[#F8F6F2] text-[#88847D]/60 border-[#E8E3DA] line-through"
                        : "bg-[#F8F6F2] text-[#88847D] border-[#E8E3DA] hover:text-[#292824] hover:border-[#A58B6F]"
                  }`}
                >
                  {formatVariantChipLabel(variant)}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Selling Price & Subtle Stock Quantity */}
        <div className="flex items-baseline justify-between gap-2 mt-2">
          <span className="font-semibold text-[15px] text-[#292824] tabular-nums tracking-tight">
            {currencySymbol}
            {effectivePrice.toFixed(2)}
          </span>
          <span
            data-testid="product-stock"
            className="text-[11px] text-[#88847D] font-normal truncate"
          >
            In stock: {effectiveStock}
          </span>
        </div>

        {/* Restrained warning status only when critical */}
        <div data-testid="stock-status" className="min-h-[16px] mt-0.5">
          {isOutOfStock ? (
            <span className="text-[11px] text-[#88847D] font-medium">
              Out of stock
            </span>
          ) : isAtMax ? (
            <span className="text-[11px] text-[#B45309] font-medium">
              Only {effectiveStock} available
            </span>
          ) : effectiveStock <= effectiveReorderLevel ? (
            <span className="text-[11px] text-[#B45309] font-medium">
              Low stock
            </span>
          ) : null}
        </div>

        {/* Accessible projection retained for automated state verification */}
        <span data-testid="remaining-stock" className="sr-only">
          Remaining after this sale: {remainingStock}
        </span>
      </div>

      {/* 4. Clean (-) Quantity (+) Controls */}
      <div className="mt-3 pt-2.5 border-t border-[#E8E3DA] flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Decrease quantity"
          data-testid="card-decrease-qty"
          disabled={isOutOfStock || effectiveCartQty <= 0}
          onClick={handleDecrement}
          className="w-8 h-8 rounded-lg border border-[#E8E3DA] bg-[#F8F6F2] hover:bg-[#EFE8DE] hover:border-[#795438]/40 text-[#795438] flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#795438]"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span
          data-testid="card-cart-qty"
          aria-label="Quantity"
          className={`min-w-[2.25rem] px-2 py-1 rounded-md text-center text-sm font-semibold tabular-nums select-none ${
            effectiveCartQty > 0
              ? "bg-[#F8F6F2] text-[#795438] border border-[#795438]/25"
              : "text-[#292824]"
          }`}
        >
          {effectiveCartQty}
        </span>

        <button
          type="button"
          aria-label="Increase quantity"
          data-testid="card-increase-qty"
          disabled={isOutOfStock || isAtMax}
          onClick={handleIncrement}
          className="w-8 h-8 rounded-lg bg-[#795438] hover:bg-[#63432B] active:bg-[#523621] text-[#F8F6F2] flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#795438]"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
};
