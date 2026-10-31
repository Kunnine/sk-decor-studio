import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImageUploader } from "../components/ui/ImageUploader";

describe("ImageUploader Component", () => {
  it("renders drop zone placeholder when no image is selected", () => {
    const handleFileSelect = vi.fn();
    render(<ImageUploader onFileSelect={handleFileSelect} />);

    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    expect(screen.getByText(/webp, png, or jpg/i)).toBeInTheDocument();
  });

  it("renders existing image thumbnail when currentImageUrl is provided", () => {
    const handleFileSelect = vi.fn();
    render(
      <ImageUploader
        currentImageUrl="http://localhost:8000/storage/products/test.webp"
        onFileSelect={handleFileSelect}
      />,
    );

    const img = screen.getByAltText("Preview");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "http://localhost:8000/storage/products/test.webp",
    );
    expect(screen.getByText(/current product image/i)).toBeInTheDocument();
  });

  it("validates file type and rejects non-image formats", () => {
    const handleFileSelect = vi.fn();
    render(<ImageUploader onFileSelect={handleFileSelect} />);

    const input = screen.getByTestId("image-file-input") as HTMLInputElement;
    const file = new File(["dummy content"], "document.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    expect(handleFileSelect).not.toHaveBeenCalled();
  });
});
