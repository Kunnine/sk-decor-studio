import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 7);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-[#4338CA] ml-1 font-bold">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm bg-white text-slate-900 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4338CA] focus:border-[#4338CA] transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${
            error ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-slate-900 font-medium flex items-center gap-1">
            <span className="font-bold underline">Error:</span> {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
