import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  };

  // Minimal Scandinavian & Japandi luxury palette: Dark warm brown #795438, Accent #A58B6F, Warm Neutrals
  const variantStyles = {
    primary:
      "bg-[#795438] hover:bg-[#63432B] active:bg-[#523621] text-white focus:ring-[#795438] border border-transparent shadow-none",
    secondary:
      "bg-[#F3EDE6] hover:bg-[#EAE1D6] text-[#292824] focus:ring-[#A58B6F] border border-[#E2D9CE]",
    outline:
      "bg-white hover:bg-[#F8F6F2] text-[#292824] border border-[#DDD6CA] focus:ring-[#795438]",
    ghost:
      "bg-transparent hover:bg-[#EFEAE2]/70 text-[#292824] focus:ring-[#A58B6F] border border-transparent",
    danger:
      "bg-[#292824] hover:bg-[#3D3B35] text-white border border-[#292824] focus:ring-[#292824] font-semibold",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
