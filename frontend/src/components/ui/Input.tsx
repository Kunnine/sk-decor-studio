import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, rightElement, className = "", id, ...props },
    ref,
  ) => {
    const inputId =
      id || props.name || Math.random().toString(36).substring(2, 7);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-[#795438] ml-1 font-bold">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3 py-2 text-sm bg-white text-[#292824] border rounded-lg placeholder-[#88847D]/70 focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] transition-colors disabled:bg-[#F8F6F2] disabled:text-[#88847D] ${
              rightElement ? "pr-10" : ""
            } ${
              error
                ? "border-[#292824] ring-1 ring-[#292824]"
                : "border-[#DDD6CA]"
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-[#292824] font-medium flex items-center gap-1">
            <span className="font-bold underline">Error:</span> {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-xs text-[#88847D]">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
