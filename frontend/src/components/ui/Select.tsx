import React, { forwardRef } from "react";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const selectId =
      id || props.name || Math.random().toString(36).substring(2, 7);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#292824] mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-[#795438] ml-1 font-bold">*</span>
            )}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2 text-sm bg-white text-[#292824] border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#795438] focus:border-[#795438] transition-colors disabled:bg-[#F8F6F2] disabled:text-[#88847D] ${
            error
              ? "border-[#292824] ring-1 ring-[#292824]"
              : "border-[#DDD6CA]"
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = "Select";
