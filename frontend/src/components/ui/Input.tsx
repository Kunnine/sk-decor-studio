import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
  inputVariant?: "default" | "blue";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      rightElement,
      inputVariant = "default",
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const inputId =
      id || props.name || Math.random().toString(36).substring(2, 7);

    const isBlue = inputVariant === "blue";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
              isBlue ? "text-slate-700" : "text-[#292824]"
            }`}
          >
            {label}
            {props.required && (
              <span className={`ml-1 font-bold ${isBlue ? "text-blue-600" : "text-[#795438]"}`}>*</span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3.5 py-2.5 text-sm bg-white rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              isBlue
                ? `text-slate-900 placeholder-slate-400 border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 ${
                    error
                      ? "border-red-400 ring-1 ring-red-400"
                      : "border-slate-300 hover:border-slate-400"
                  }`
                : `text-[#292824] border rounded-lg placeholder-[#88847D]/70 focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] disabled:bg-[#F8F6F2] disabled:text-[#88847D] ${
                    error
                      ? "border-[#292824] ring-1 ring-[#292824]"
                      : "border-[#DDD6CA]"
                  }`
            } ${rightElement ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${
            isBlue ? "text-red-600" : "text-[#292824]"
          }`}>
            <span className="font-bold underline">Error:</span> {error}
          </p>
        )}
        {!error && helperText && (
          <p className={`mt-1 text-xs ${isBlue ? "text-slate-500" : "text-[#88847D]"}`}>{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
