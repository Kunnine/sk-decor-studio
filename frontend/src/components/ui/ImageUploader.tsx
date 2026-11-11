import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting?: () => void;
  disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  onFileSelect,
  onRemoveExisting,
  disabled = false,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, []);

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);

    // Validate format (JPG, JPEG, PNG, WebP)
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const hasValidExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    const hasValidMime = file.type
      ? validTypes.includes(file.type.toLowerCase())
      : hasValidExtension;

    if (!hasValidMime) {
      setErrorMessage(
        "Invalid file type. Please upload a JPG, JPEG, PNG, or WebP image.",
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size <= 0) {
      setErrorMessage("Selected image file is empty.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Validate size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage("Image size exceeds 2MB limit.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      revokeObjectUrl();
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setSelectedFileMeta({ name: file.name, size: file.size });
      onFileSelect(file);
    };
    img.onerror = () => {
      setErrorMessage("Failed to read image file.");
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    revokeObjectUrl();
    setPreviewUrl(null);
    setSelectedFileMeta(null);
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
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        data-testid="image-file-input"
      />

      {activeImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg p-3 bg-white border transition-colors flex flex-col sm:flex-row sm:items-center gap-4 ${
            dragOver ? "border-[#795438] bg-[#F3EDE6]/40" : "border-[#E8E3DA]"
          }`}
        >
          <div className="w-24 h-28 sm:w-24 sm:h-28 rounded-lg border border-[#E8E3DA] bg-[#F8F6F2] overflow-hidden shrink-0">
            <img
              src={activeImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#292824]">
              {previewUrl ? "New image selected" : "Current product image"}
            </p>
            {selectedFileMeta ? (
              <p className="text-[11px] text-[#88847D] mt-0.5 truncate">
                {selectedFileMeta.name} ({formatFileSize(selectedFileMeta.size)}
                )
              </p>
            ) : (
              <p className="text-[11px] text-[#88847D] mt-0.5">
                Drag and drop a new image here or choose Replace below
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#795438] text-white hover:bg-[#63432B] transition-colors disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#DDD6CA] bg-[#F8F6F2] text-[#292824] hover:bg-[#EFEAE2] transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#795438] bg-[#F3EDE6]/50"
              : "border-[#DDD6CA] hover:border-[#795438] bg-white"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#795438]">
              <UploadCloud className="w-5 h-5 text-[#795438]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#292824]">
                <span className="text-[#795438] hover:underline">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-[11px] text-[#88847D] mt-0.5">
                WebP, PNG, or JPG / JPEG (max 2MB, min 200×200px)
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-xs text-[#292824] bg-[#F3EDE6] border border-[#DDD6CA] px-3 py-2 rounded-md"
        >
          <AlertCircle className="w-4 h-4 text-[#795438] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
