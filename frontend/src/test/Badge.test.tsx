import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../components/ui/Badge";

describe("Badge Component", () => {
  it("renders neutral badge by default", () => {
    render(<Badge>In Stock</Badge>);
    const badge = screen.getByText("In Stock");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-slate-100");
  });

  it("renders warning variant in amber for low stock alerts", () => {
    render(<Badge variant="warning">3 Left (Low Stock)</Badge>);
    const badge = screen.getByText("3 Left (Low Stock)");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-amber-900");
    expect(badge).toHaveClass("bg-[#FEF3C7]");
  });
});
