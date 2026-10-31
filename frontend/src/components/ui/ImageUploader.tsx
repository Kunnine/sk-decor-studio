import React, { useRef, useState } from "react";
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting?: () => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  onFileSelect,
  onRemoveExisting,
  disabled = false,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage(
        "Invalid file type. Please upload a JPG, PNG, or WebP image.",
      );
      return;
    }

    // Validate size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage("Image size exceeds 2MB limit.");
      return;
    }

    // Validate dimensions >= 200x200
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 200 || img.naturalHeight < 200) {
        setErrorMessage(
          `Image dimensions (${img.naturalWidth}x${img.naturalHeight}px) are too small. Minimum is 200x200px.`,
        );
        URL.revokeObjectURL(objectUrl);
        return;
      }

      setPreviewUrl(objectUrl);
      onFileSelect(file);
    };
    img.onerror = () => {
      setErrorMessage("Failed to read image file.");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileSelect(null);
    if (onRemoveExisting) {
      onRemoveExisting();
    }
  };

  const activeImage = previewUrl || currentImageUrl;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        data-testid="image-file-input"
      />

      {activeImage ? (
        <div className="relative border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center gap-4">
          <img
            src={activeImage}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-md border border-slate-200 bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">
              {previewUrl ? "New image selected" : "Current product image"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Processed as WebP main (max 800px) and thumbnail (200x200)
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="text-xs font-semibold text-[#4338CA] hover:underline"
              >
                Replace
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Remove
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#4338CA] bg-indigo-50/20"
              : "border-slate-300 hover:border-slate-400 bg-white"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <UploadCloud className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                <span className="text-[#4338CA] hover:underline">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                WebP, PNG, or JPG (max 2MB, min 200×200px)
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-md">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
