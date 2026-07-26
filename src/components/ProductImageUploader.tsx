import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { validateImageFile } from '../lib/storage-utils.ts';

export interface ProductImageUploaderProps {
  id?: string;
  label: string;
  description?: string;
  currentImageUrl?: string;
  currentImagePath?: string;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  altText: string;
  onAltTextChange: (altText: string) => void;
  uploadProgress?: number | null;
  isUploading?: boolean;
  onRemoveImage?: () => void;
  disabled?: boolean;
  required?: boolean;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  id = 'product-image-uploader',
  label,
  description = 'Supports JPEG, PNG, or WebP up to 5 MB. Image is uploaded upon saving.',
  currentImageUrl,
  selectedFile,
  onFileSelect,
  altText,
  onAltTextChange,
  uploadProgress = null,
  isUploading = false,
  onRemoveImage,
  disabled = false,
  required = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate local object URL preview for staged file
  const localPreviewUrl = React.useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  // Clean up object URL memory leak
  React.useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const previewUrl = localPreviewUrl || currentImageUrl;

  const handleFileChange = (file: File | null) => {
    setValidationError(null);
    if (!file) {
      onFileSelect(null);
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid image file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    onFileSelect(file);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleClearSelection = () => {
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileSelect(null);
    if (onRemoveImage) {
      onRemoveImage();
    }
  };

  const triggerPicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Label and Section Description */}
      <div className="flex justify-between items-baseline">
        <label 
          htmlFor={`${id}-file`} 
          className="block text-sm font-semibold text-stone-800"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-xs text-stone-500 font-medium">JPEG, PNG, WebP (Max 5MB)</span>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div 
          role="alert" 
          className="flex items-start gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{validationError}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setValidationError(null)}
            className="text-red-500 hover:text-red-700 p-0.5 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Upload / Preview Area */}
      {previewUrl ? (
        <div className="relative border border-stone-200 rounded-xl overflow-hidden bg-stone-50 group">
          {/* Image Display */}
          <div className="relative aspect-video w-full bg-stone-100 flex items-center justify-center overflow-hidden">
            <img
              src={previewUrl}
              alt={altText || 'Product preview'}
              className="w-full h-full object-cover"
            />

            {/* Upload Overlay Status */}
            {isUploading && (
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                <p className="text-sm font-medium">Uploading to Firebase Storage...</p>
                {uploadProgress !== null && (
                  <div className="w-48 bg-stone-700/80 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-200" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploadProgress !== null && (
                  <p className="text-xs text-stone-300 mt-1">{uploadProgress}%</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions Footer Bar */}
          <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-stone-600 truncate">
              {selectedFile ? (
                <>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Staged
                  </span>
                  <span className="truncate max-w-[180px] font-mono">{selectedFile.name}</span>
                  <span>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    <ImageIcon className="w-3.5 h-3.5 text-stone-500" /> Active Image
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerPicker}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200 disabled:opacity-50"
                aria-label="Replace image"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                aria-label="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone Box when no image is selected */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerPicker}
          tabIndex={0}
          role="button"
          aria-label={`${label} file dropzone`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerPicker();
            }
          }}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
            flex flex-col items-center justify-center gap-2
            ${isDragging 
              ? 'border-emerald-500 bg-emerald-50/50 shadow-inner scale-[0.99]' 
              : 'border-stone-300 hover:border-emerald-400 bg-stone-50/50 hover:bg-stone-100/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-800 mb-1">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              Drag & drop image here, or <span className="text-emerald-700 underline underline-offset-2">browse file</span>
            </p>
            <p className="text-xs text-stone-500 mt-1">{description}</p>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        id={`${id}-file`}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label={label}
      />

      {/* Alt Text Input */}
      <div className="space-y-1">
        <label 
          htmlFor={`${id}-alt`} 
          className="block text-xs font-medium text-stone-700"
        >
          Image Alt Text (Accessibility)
        </label>
        <input
          id={`${id}-alt`}
          type="text"
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          placeholder="e.g. Fresh organic Nantes carrots grown at Hoskote farm"
          disabled={disabled || isUploading}
          className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white disabled:bg-stone-100"
        />
      </div>
    </div>
  );
};
