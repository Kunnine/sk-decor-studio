import React, { useState, useEffect, useRef, useCallback } from "react";
import { Minus, Plus } from "lucide-react";

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (val: number) => void;
  onEnter?: () => void;
  disabled?: boolean;
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  min = 1,
  max,
  onChange,
  onEnter,
  disabled = false,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState(String(value));

  // Sync internal display if external value changes
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const effectiveMax = Math.max(0, max);
  const isOutOfStock = effectiveMax === 0;
  const isAtMin = value <= min;
  const isAtMax = value >= effectiveMax;

  const clampAndNotify = useCallback(
    (targetVal: number) => {
      if (isOutOfStock) {
        onChange(0);
        setInputValue("0");
        return;
      }
      const clamped = Math.min(Math.max(targetVal, min), effectiveMax);
      onChange(clamped);
      setInputValue(String(clamped));
    },
    [effectiveMax, isOutOfStock, min, onChange],
  );

  const stepDown = useCallback(() => {
    if (disabled || isOutOfStock || isAtMin) return;
    clampAndNotify(value - 1);
  }, [clampAndNotify, disabled, isAtMin, isOutOfStock, value]);

  const stepUp = useCallback(() => {
    if (disabled || isOutOfStock || isAtMax) return;
    clampAndNotify(value + 1);
  }, [clampAndNotify, disabled, isAtMax, isOutOfStock, value]);

  // Hold-to-repeat timers and mouse vs click coordination
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const steppedOnMouseDownMinus = useRef(false);
  const steppedOnMouseDownPlus = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const startHoldMinus = () => {
    if (disabled || isOutOfStock || isAtMin) return;
    steppedOnMouseDownMinus.current = true;
    stepDown();
    clearTimers();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        stepDown();
      }, 100);
    }, 400);
  };

  const startHoldPlus = () => {
    if (disabled || isOutOfStock || isAtMax) return;
    steppedOnMouseDownPlus.current = true;
    stepUp();
    clearTimers();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        stepUp();
      }, 100);
    }, 400);
  };

  const handleClickMinus = (e: React.MouseEvent) => {
    e.preventDefault();
    if (steppedOnMouseDownMinus.current) {
      steppedOnMouseDownMinus.current = false;
      return;
    }
    stepDown();
  };

  const handleClickPlus = (e: React.MouseEvent) => {
    e.preventDefault();
    if (steppedOnMouseDownPlus.current) {
      steppedOnMouseDownPlus.current = false;
      return;
    }
    stepUp();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow whole numbers only
    const digitsOnly = raw.replace(/\D/g, "");
    setInputValue(digitsOnly);

    if (digitsOnly !== "") {
      const parsed = parseInt(digitsOnly, 10);
      if (!isNaN(parsed) && parsed >= min && parsed <= effectiveMax) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (isOutOfStock) {
      setInputValue("0");
      onChange(0);
      return;
    }
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < min) {
      clampAndNotify(min);
    } else if (parsed > effectiveMax) {
      clampAndNotify(effectiveMax);
    } else {
      clampAndNotify(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepDown();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      if (onEnter) {
        onEnter();
      }
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || isOutOfStock || isAtMin}
        onClick={handleClickMinus}
        onMouseDown={startHoldMinus}
        onMouseUp={clearTimers}
        onMouseLeave={clearTimers}
        onTouchStart={startHoldMinus}
        onTouchEnd={clearTimers}
        onTouchCancel={clearTimers}
        className="min-h-[40px] min-w-[40px] h-10 w-10 flex items-center justify-center rounded-lg border border-[#DDD6CA] bg-white text-[#292824] hover:bg-[#F8F6F2] active:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#795438] transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Quantity"
        value={inputValue}
        disabled={disabled || isOutOfStock}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="min-h-[40px] h-10 w-16 text-center text-sm font-semibold text-[#292824] border border-[#DDD6CA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#795438] disabled:bg-[#F8F6F2] disabled:text-[#88847D] transition-colors"
      />

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || isOutOfStock || isAtMax}
        onClick={handleClickPlus}
        onMouseDown={startHoldPlus}
        onMouseUp={clearTimers}
        onMouseLeave={clearTimers}
        onTouchStart={startHoldPlus}
        onTouchEnd={clearTimers}
        onTouchCancel={clearTimers}
        className="min-h-[40px] min-w-[40px] h-10 w-10 flex items-center justify-center rounded-lg border border-[#DDD6CA] bg-white text-[#292824] hover:bg-[#F8F6F2] active:bg-[#F3EDE6] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#795438] transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
