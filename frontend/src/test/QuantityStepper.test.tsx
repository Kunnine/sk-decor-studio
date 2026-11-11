import React, { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QuantityStepper } from "../components/ui/QuantityStepper";

describe("QuantityStepper Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with default value and respects min and max limits", () => {
    const handleChange = vi.fn();
    render(
      <QuantityStepper value={1} min={1} max={5} onChange={handleChange} />,
    );

    const decBtn = screen.getByRole("button", { name: "Decrease quantity" });
    const incBtn = screen.getByRole("button", { name: "Increase quantity" });
    const input = screen.getByRole("textbox", { name: "Quantity" });

    expect(input).toHaveValue("1");
    // At minimum 1, decrease is disabled
    expect(decBtn).toBeDisabled();
    expect(incBtn).not.toBeDisabled();

    // Click increment
    fireEvent.click(incBtn);
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it("disables + button when value reaches max available stock", () => {
    const handleChange = vi.fn();
    render(
      <QuantityStepper value={5} min={1} max={5} onChange={handleChange} />,
    );

    const incBtn = screen.getByRole("button", { name: "Increase quantity" });
    const decBtn = screen.getByRole("button", { name: "Decrease quantity" });

    expect(incBtn).toBeDisabled();
    expect(decBtn).not.toBeDisabled();
  });

  it("disables all controls when max stock is 0", () => {
    const handleChange = vi.fn();
    render(
      <QuantityStepper value={0} min={1} max={0} onChange={handleChange} />,
    );

    const decBtn = screen.getByRole("button", { name: "Decrease quantity" });
    const incBtn = screen.getByRole("button", { name: "Increase quantity" });
    const input = screen.getByRole("textbox", { name: "Quantity" });

    expect(decBtn).toBeDisabled();
    expect(incBtn).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it("clamps typed input to 1..stock on blur", () => {
    const Wrapper = () => {
      const [qty, setQty] = useState(1);
      return <QuantityStepper value={qty} min={1} max={10} onChange={setQty} />;
    };

    render(<Wrapper />);
    const input = screen.getByRole("textbox", { name: "Quantity" });

    // Type 99 (exceeds max 10)
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("10");

    // Type 0 (below min 1)
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("1");

    // Type negative/invalid text
    fireEvent.change(input, { target: { value: "-5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("5");
  });

  it("supports keyboard navigation: ArrowUp, ArrowDown, and Enter", () => {
    const handleEnter = vi.fn();
    const Wrapper = () => {
      const [qty, setQty] = useState(2);
      return (
        <QuantityStepper
          value={qty}
          min={1}
          max={5}
          onChange={setQty}
          onEnter={handleEnter}
        />
      );
    };

    render(<Wrapper />);
    const input = screen.getByRole("textbox", { name: "Quantity" });

    // ArrowUp -> 3
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("3");

    // ArrowDown -> 2
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveValue("2");

    // Enter -> triggers onEnter
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handleEnter).toHaveBeenCalledTimes(1);
  });

  it("supports hold-to-repeat on + and - after 400ms delay", () => {
    const handleChange = vi.fn();
    render(
      <QuantityStepper value={2} min={1} max={10} onChange={handleChange} />,
    );

    const incBtn = screen.getByRole("button", { name: "Increase quantity" });

    // Mouse down starts hold timer
    fireEvent.mouseDown(incBtn);
    expect(handleChange).toHaveBeenCalledWith(3); // Immediate step

    // Advance 300ms (not yet 400ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(handleChange).toHaveBeenCalledTimes(1);

    // Advance past 400ms (e.g. +200ms -> 2 intervals of 100ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(handleChange.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Mouse up stops repeating
    fireEvent.mouseUp(incBtn);
    const countAfterMouseUp = handleChange.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(handleChange.mock.calls.length).toBe(countAfterMouseUp);
  });
});
