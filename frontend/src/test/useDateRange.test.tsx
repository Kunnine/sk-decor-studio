import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import React from "react";
import { useDateRange, getPresetDates } from "../hooks/useDateRange";

describe("useDateRange hook", () => {
  it("computes accurate preset dates for today, 7d, 30d", () => {
    const today = getPresetDates("today");
    expect(today.from).toBe(today.to);

    const sevenDays = getPresetDates("7d");
    expect(new Date(sevenDays.to).getTime()).toBeGreaterThanOrEqual(
      new Date(sevenDays.from).getTime(),
    );

    const thirtyDays = getPresetDates("30d");
    expect(new Date(thirtyDays.to).getTime()).toBeGreaterThanOrEqual(
      new Date(thirtyDays.from).getTime(),
    );
  });

  it("defaults to 30d preset when no URL parameters provided", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
    );

    const { result } = renderHook(() => useDateRange(), { wrapper });
    expect(result.current.preset).toBe("30d");
    expect(result.current.from).toBeDefined();
    expect(result.current.to).toBeDefined();
  });

  it("reads custom preset and range from URL search params", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          "/dashboard?preset=custom&from=2026-01-01&to=2026-01-31",
        ]}
      >
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useDateRange(), { wrapper });
    expect(result.current.preset).toBe("custom");
    expect(result.current.from).toBe("2026-01-01");
    expect(result.current.to).toBe("2026-01-31");
  });

  it("updates range and preset via setRange", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
    );

    const { result } = renderHook(() => useDateRange(), { wrapper });

    act(() => {
      result.current.setRange("today");
    });

    expect(result.current.preset).toBe("today");
    expect(result.current.from).toBe(result.current.to);
  });
});
