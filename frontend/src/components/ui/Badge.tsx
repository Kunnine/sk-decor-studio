import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "primary" | "warning" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
  };

  const variantStyles = {
    neutral: "bg-slate-100 text-slate-800 border border-slate-200 font-medium",
    primary:
      "bg-[#EEF2FF] text-[#4338CA] border border-indigo-200 font-semibold",
    warning: "bg-[#FEF3C7] text-amber-900 border border-amber-300 font-bold", // Used for low stock warnings
    outline:
      "bg-transparent text-slate-700 border border-slate-300 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
