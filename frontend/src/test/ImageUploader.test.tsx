import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("rejects images larger than 2MB", () => {
    const handleFileSelect = vi.fn();
    render(<ImageUploader onFileSelect={handleFileSelect} />);

    const input = screen.getByTestId("image-file-input") as HTMLInputElement;
    const oversized = new File(
      [new Uint8Array(2 * 1024 * 1024 + 10)],
      "big.jpg",
      {
        type: "image/jpeg",
      },
    );

    fireEvent.change(input, { target: { files: [oversized] } });

    expect(screen.getByText(/exceeds 2mb limit/i)).toBeInTheDocument();
    expect(handleFileSelect).not.toHaveBeenCalled();
  });

  it("supports drag-and-drop upload, live preview, replace, and remove", async () => {
    const originalImage = window.Image;
    window.Image = class {
      onload: () => void = () => {};
      naturalWidth = 600;
      naturalHeight = 600;
      set src(_: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    const handleFileSelect = vi.fn();
    const handleRemoveExisting = vi.fn();

    try {
      render(
        <ImageUploader
          onFileSelect={handleFileSelect}
          onRemoveExisting={handleRemoveExisting}
        />,
      );

      const dropTarget = screen.getByText(/click to upload/i).closest("div")!
        .parentElement!.parentElement!;

      const webpFile = new File(["webp bytes"], "vase.webp", {
        type: "image/webp",
      });

      fireEvent.drop(dropTarget, {
        dataTransfer: { files: [webpFile] },
      });

      await waitFor(() => {
        expect(screen.getByAltText("Preview")).toBeInTheDocument();
        expect(screen.getByText(/new image selected/i)).toBeInTheDocument();
        expect(screen.getByText(/vase\.webp/i)).toBeInTheDocument();
      });
      expect(handleFileSelect).toHaveBeenCalledWith(webpFile);

      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      expect(handleFileSelect).toHaveBeenCalledWith(null);
      expect(handleRemoveExisting).toHaveBeenCalled();
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    } finally {
      window.Image = originalImage;
    }
  });
});
