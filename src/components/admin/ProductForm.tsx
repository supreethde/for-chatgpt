import React, { useState, useEffect, useRef } from 'react';
import {
  AssuranceTier,
  CatalogProduct,
  CultivationMethod,
  CULTIVATION_METHODS,
  ProductCategory,
  ProductQualityRange,
  ProductVariant,
  StockStatus,
  SOURCING_TIERS,
} from '../../types';
import { Plus, Trash2, X, Image as ImageIcon, AlertCircle, Check, ArrowLeft, Upload, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { auth } from '../../lib/firebase-auth';
import { uploadProductImage, validateImageFile } from '../../lib/storage-utils';
import { PRODUCT_IMAGE_ROLES } from '../../features/products/productImages';
import {
  createEmptyPackVariant,
  createEmptyQualityRange,
  normalizeProductQualityRanges,
  validateQualityRanges,
} from '../../features/products/productModel';

interface ProductFormProps {
  product?: CatalogProduct | null; // null if adding new product
  onSave: (product: CatalogProduct) => void;
  onCancel: () => void;
}

const CATEGORIES: ProductCategory[] = [
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Microgreens',
  'Exotics',
  'Mushrooms',
];

const STOCK_STATUS_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
  // Form State
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [category, setCategory] = useState<ProductCategory>(product?.category || 'Vegetables');
  const [scientificName, setScientificName] = useState(product?.scientificName || '');
  const [displayOrder, setDisplayOrder] = useState<number>(product?.displayOrder ?? 100);
  const [shortIntro, setShortIntro] = useState(product?.shortIntro || '');
  
  // 4 key highlights
  const [highlights, setHighlights] = useState<string[]>(
    product?.highlights?.length === 4
      ? [...product.highlights]
      : [
          product?.highlights?.[0] || '',
          product?.highlights?.[1] || '',
          product?.highlights?.[2] || '',
          product?.highlights?.[3] || '',
        ]
  );

  const [description, setDescription] = useState(product?.description || '');
  const [regionalNameKannada, setRegionalNameKannada] = useState(product?.regionalNameKannada || '');
  const [regionalNameHindi, setRegionalNameHindi] = useState(product?.regionalNameHindi || '');
  
  // Four role-based image URLs from Firebase Storage
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length > 0 ? [...product.images] : []
  );

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [qualityRanges, setQualityRanges] = useState<ProductQualityRange[]>(() => {
    if (!product) return [createEmptyQualityRange()];
    const normalized = normalizeProductQualityRanges(
      product as CatalogProduct & Record<string, unknown>
    );
    return normalized.length > 0 ? normalized : [createEmptyQualityRange()];
  });

  const [isActive, setIsActive] = useState<boolean>(product?.isActive ?? true);
  const [featuredProduct, setFeaturedProduct] = useState<boolean>(
    product?.featuredProduct ?? false
  );
  const [promotionalPriority, setPromotionalPriority] = useState<
    'none' | 'low' | 'medium' | 'high'
  >(product?.promotionalPriority || 'none');
  const [excludeFromRecommendations, setExcludeFromRecommendations] = useState<boolean>(
    product?.excludeFromRecommendations ?? false
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState<boolean>(!product?.slug);

  // Helper to generate slug from name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  useEffect(() => {
    if (autoSlug && name) {
      setSlug(generateSlug(name));
    }
  }, [name, autoSlug]);

  // Count sentences in short intro
  const sentenceCount = shortIntro
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;

  // Count words in description
  const wordCount = description
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const handleHighlightChange = (index: number, value: string) => {
    const updated = [...highlights];
    updated[index] = value;
    setHighlights(updated);
  };

  // Image Upload Handler using Direct Firebase Storage Web SDK
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUploadError('You must be signed in as an administrator to upload images.');
      if (e.target) e.target.value = '';
      return;
    }

    const maxAllowed = 4;
    const currentCount = images.length;
    const availableSlots = maxAllowed - currentCount;

    if (availableSlots <= 0) {
      setUploadError('All 4 product image slots are already filled.');
      if (e.target) e.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);

    // Validate selected files
    for (const file of selectedFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file format or size.');
        if (e.target) e.target.value = '';
        return;
      }
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const newUploadedUrls: string[] = [];
    const currentSlug = slug.trim() || generateSlug(name) || 'product';

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatusText(`Uploading image ${i + 1} of ${selectedFiles.length}...`);

        const result = await uploadProductImage(file, currentSlug, (filePercent) => {
          const overallPercent = Math.round(
            ((i + filePercent / 100) / selectedFiles.length) * 100
          );
          setUploadProgress(overallPercent);
        });

        if (result.url) {
          newUploadedUrls.push(result.url);
        }
      }

      setImages((prev) => [...prev, ...newUploadedUrls]);
      setUploadProgress(100);
      setUploadStatusText('Upload complete!');
      setTimeout(() => {
        setUploading(false);
        setUploadStatusText('');
      }, 800);
    } catch (err: any) {
      console.error('Failed to upload image(s):', err);
      setUploadError(err?.message || 'Failed to upload image.');
      setUploading(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddQualityRange = () => {
    if (qualityRanges.length >= 3) return;
    setQualityRanges((current) => [...current, createEmptyQualityRange()]);
  };

  const handleRemoveQualityRange = (rangeIndex: number) => {
    if (qualityRanges.length <= 1) return;
    setQualityRanges((current) =>
      current.filter((_, index) => index !== rangeIndex)
    );
  };

  const handleMoveQualityRange = (rangeIndex: number, direction: -1 | 1) => {
    const targetIndex = rangeIndex + direction;
    if (targetIndex < 0 || targetIndex >= qualityRanges.length) return;
    setQualityRanges((current) => {
      const updated = [...current];
      [updated[rangeIndex], updated[targetIndex]] = [
        updated[targetIndex],
        updated[rangeIndex],
      ];
      return updated;
    });
  };

  const handleUpdateQualityRange = (
    rangeIndex: number,
    field: keyof ProductQualityRange,
    value: unknown
  ) => {
    setQualityRanges((current) =>
      current.map((range, index) => {
        if (index !== rangeIndex) return range;
        if (field === 'minimumOrderQuantity') {
          return {
            ...range,
            minimumOrderQuantity:
              value === '' ? undefined : Math.max(1, Number(value)),
          };
        }
        return { ...range, [field]: value };
      })
    );
  };

  const handleAddVariant = (rangeIndex: number) => {
    setQualityRanges((current) =>
      current.map((range, index) =>
        index === rangeIndex
          ? { ...range, variants: [...range.variants, createEmptyPackVariant()] }
          : range
      )
    );
  };

  const handleUpdateVariant = (
    rangeIndex: number,
    variantIndex: number,
    field: keyof ProductVariant | 'price' | 'mrp',
    value: unknown
  ) => {
    setQualityRanges((current) =>
      current.map((range, currentRangeIndex) => {
        if (currentRangeIndex !== rangeIndex) return range;
        const variants = range.variants.map((variant, currentVariantIndex) => {
          if (currentVariantIndex !== variantIndex) return variant;
          const updated = { ...variant };

          if (field === 'sellingPrice' || field === 'price') {
            const price = value === '' ? ('' as unknown as number) : Number(value);
            updated.sellingPrice = price;
            updated.price = price;
          } else if (field === 'previousPrice' || field === 'mrp') {
            const previousPrice = value === '' ? undefined : Number(value);
            updated.previousPrice = previousPrice;
            updated.mrp = previousPrice;
          } else if (field === 'quantity') {
            updated.quantity = value === '' ? undefined : Number(value);
          } else {
            Object.assign(updated, { [field]: value });
          }

          return updated;
        });
        return { ...range, variants };
      })
    );
  };

  const handleRemoveVariant = (rangeIndex: number, variantIndex: number) => {
    setQualityRanges((current) =>
      current.map((range, index) =>
        index === rangeIndex && range.variants.length > 1
          ? {
              ...range,
              variants: range.variants.filter(
                (_, currentVariantIndex) => currentVariantIndex !== variantIndex
              ),
            }
          : range
      )
    );
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!slug.trim()) {
      newErrors.slug = 'URL slug is required';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      newErrors.slug = 'Use lowercase letters, numbers and single hyphens only';
    }
    if (displayOrder === undefined || displayOrder === null || isNaN(displayOrder)) {
      newErrors.displayOrder = 'Display order is required and must be a valid number';
    }
    
    if (!shortIntro.trim()) {
      newErrors.shortIntro = 'Short introduction is required';
    } else if (sentenceCount > 2) {
      newErrors.shortIntro = 'Short intro must be two concise sentences max';
    }

    if (highlights.some((h) => !h.trim())) {
      newErrors.highlights = 'All 4 key highlights must be provided';
    }

    if (!description.trim()) {
      newErrors.description = 'Product description is required';
    }

    if (images.length !== 4) {
      newErrors.images =
        'Exactly 4 product images are required in this order: botanical, real product, benefits, and why organic.';
    }
    if (uploading) {
      newErrors.images = 'Please wait for image upload to complete.';
    }

    const rangeValidation = validateQualityRanges(qualityRanges);
    if (!rangeValidation.valid) {
      rangeValidation.errors.forEach((message, index) => {
        newErrors[`qualityRange_${index}`] = message;
      });
      newErrors.qualityRanges =
        'Review the quality ranges and pack-size variants below.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanedImages = images.filter((img) => img.trim().length > 0);

    const formattedQualityRanges: ProductQualityRange[] = qualityRanges.map((range) => ({
      ...range,
      assuranceTier: range.assuranceTier as AssuranceTier,
      cultivationMethod: range.cultivationMethod as CultivationMethod,
      sourceFarm: range.sourceFarm?.trim() || undefined,
      certificationDetails: range.certificationDetails?.trim() || undefined,
      certificationDocumentUrl: range.certificationDocumentUrl?.trim() || undefined,
      labReportUrl: range.labReportUrl?.trim() || undefined,
      internalNotes: range.internalNotes?.trim() || undefined,
      variants: range.variants.map((variant) => {
        const sellingPrice = Number(variant.sellingPrice ?? variant.price ?? 0);
        const previousPrice =
          variant.previousPrice !== undefined && variant.previousPrice !== null
            ? Number(variant.previousPrice)
            : variant.mrp !== undefined && variant.mrp !== null
              ? Number(variant.mrp)
              : undefined;
        return {
          id: variant.id,
          label: variant.label.trim(),
          quantity: Number(variant.quantity),
          unit: variant.unit?.trim(),
          sellingPrice,
          ...(previousPrice !== undefined && Number.isFinite(previousPrice)
            ? { previousPrice }
            : {}),
          active: variant.active !== false,
          stockStatus: variant.stockStatus,
          ...(variant.sku?.trim() ? { sku: variant.sku.trim() } : {}),
          price: sellingPrice,
          ...(previousPrice !== undefined && Number.isFinite(previousPrice)
            ? { mrp: previousPrice }
            : {}),
        };
      }),
      requiresManualReview: false,
    }));

    const savedProduct: CatalogProduct = {
      id: product?.id || 'prod-' + Date.now(),
      name: name.trim(),
      slug: slug.trim(),
      category,
      scientificName: scientificName.trim() || undefined,
      displayOrder: Number(displayOrder) || 100,
      shortIntro: shortIntro.trim(),
      highlights: highlights.map((h) => h.trim()),
      description: description.trim(),
      regionalNameKannada: regionalNameKannada.trim() || undefined,
      regionalNameHindi: regionalNameHindi.trim() || undefined,
      images: cleanedImages,
      qualityRanges: formattedQualityRanges,
      isActive,
      featuredProduct,
      promotionalPriority,
      excludeFromRecommendations,
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedProduct);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden max-w-4xl mx-auto my-6">
      {/* Form Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-serif font-bold text-stone-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Validation Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Please correct the errors in the form:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            1. Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hydroponic Butterhead Lettuce"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
              {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* URL Slug */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <label className="text-[11px] text-stone-500 inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Auto-generate from name
              </label>
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
              placeholder="e.g. hydroponic-butterhead-lettuce"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-stone-50"
            />
            {errors.slug && <p className="text-[11px] text-red-600 mt-1">{errors.slug}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scientific Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Scientific Name <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="e.g. Lactuca sativa var. capitata"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
            </div>

            {/* Display Order (Required number) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Display Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                placeholder="100"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
              <p className="text-[10px] text-stone-500 mt-0.5">
                Sort priority in catalogue (lower numbers appear first, default 100)
              </p>
              {errors.displayOrder && <p className="text-[11px] text-red-600 mt-1">{errors.displayOrder}</p>}
            </div>
          </div>

          {/* Active / Inactive Status Toggle */}
          <div className="pt-2 flex items-center justify-between bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <p className="text-xs font-semibold text-stone-800">Product Active Status</p>
              <p className="text-[11px] text-stone-500">
                Active products appear in catalogue feeds. Inactive products remain hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300'
              }`}
            >
              {isActive ? '✓ Active' : '✕ Inactive'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 md:grid-cols-3">
            <label className="flex items-start gap-2.5 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={featuredProduct}
                onChange={(event) => setFeaturedProduct(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-800"
              />
              <span>
                <strong className="block text-stone-900">Featured Product</strong>
                Optional recommendation boost.
              </span>
            </label>

            <label className="text-xs font-semibold text-stone-700">
              Promotional Priority
              <select
                value={promotionalPriority}
                onChange={(event) =>
                  setPromotionalPriority(
                    event.target.value as 'none' | 'low' | 'medium' | 'high'
                  )
                }
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-normal focus:border-emerald-600 focus:outline-none"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={excludeFromRecommendations}
                onChange={(event) => setExcludeFromRecommendations(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-800"
              />
              <span>
                <strong className="block text-stone-900">Exclude From Recommendations</strong>
                Product stays visible but is not promoted.
              </span>
            </label>
          </div>
        </div>

        {/* Short Introduction & Highlights */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            2. Short Intro & 4 Key Highlights
          </h3>

          {/* Short Introduction (2 sentences max) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                Short Introduction <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  sentenceCount > 2 ? 'text-red-600 font-bold' : 'text-stone-500'
                }`}
              >
                {sentenceCount} / 2 concise sentences
              </span>
            </div>
            <textarea
              rows={2}
              value={shortIntro}
              onChange={(e) => setShortIntro(e.target.value)}
              placeholder="Tender, sweet butterhead lettuce grown in mineral-rich water without synthetic pesticides. Harvested daily with roots intact for peak crispness."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
            />
            {errors.shortIntro && <p className="text-[11px] text-red-600 mt-1">{errors.shortIntro}</p>}
          </div>

          {/* 4 Key Highlights */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700">
              Key Highlights (Exactly 4 bullet points) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    placeholder={`Highlight ${index + 1}, e.g. Zero synthetic chemical pesticides`}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  />
                </div>
              ))}
            </div>
            {errors.highlights && <p className="text-[11px] text-red-600 mt-1">{errors.highlights}</p>}
          </div>
        </div>

        {/* Product Description */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            3. Product Description (~80–120 words)
          </h3>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-stone-700">
                Detailed Product Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-mono text-stone-500">{wordCount} words</span>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Grown inside climate-controlled precision greenhouses, our Butterhead Lettuce features buttery, soft green leaves wrapped around a tender compact heart..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
            />
            {errors.description && <p className="text-[11px] text-red-600 mt-1">{errors.description}</p>}
          </div>
        </div>

        {/* Regional Names */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            4. Regional Names (Optional)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kannada Name (ಬೆಣ್ಣೆ ಸಾಸುವೆ ಇಲೆ)
              </label>
              <input
                type="text"
                value={regionalNameKannada}
                onChange={(e) => setRegionalNameKannada(e.target.value)}
                placeholder="e.g. ಬೆಣ್ಣೆ ಸಾಲಡ್ ಸೊಪ್ಪು (Benne Salad Soppu)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hindi Name (बटरहेड सलाद पत्ता)
              </label>
              <input
                type="text"
                value={regionalNameHindi}
                onChange={(e) => setRegionalNameHindi(e.target.value)}
                placeholder="e.g. बटरहेड सलाद पत्ता (Butterhead Salad Patta)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider">
                5. Product Images (Exactly 4)
              </h3>
              <p className="text-[11px] text-stone-500">
                Upload in the required order shown below ({images.length}/4 uploaded)
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png, image/jpeg, image/webp, image/gif"
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 4 || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-800" />
              )}
              {uploading ? 'Uploading...' : 'Upload Images'}
            </button>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-stone-700">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  {uploadStatusText}
                </span>
                <span className="font-mono text-emerald-800">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p>{uploadError}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-stone-500 hover:text-stone-800 font-bold text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Uploaded Image Thumbnails Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="group relative bg-stone-100 border border-stone-200 rounded-xl overflow-hidden aspect-square flex items-center justify-center shadow-xs"
                >
                  <img
                    src={imgUrl}
                    alt={PRODUCT_IMAGE_ROLES[idx]?.label || `Product Image ${idx + 1}`}
                    title={PRODUCT_IMAGE_ROLES[idx]?.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />

                  {/* Badge */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-stone-900/80 text-white text-[10px] font-mono rounded backdrop-blur-xs">
                    Image {idx + 1}
                  </span>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white hover:bg-red-700 rounded-lg opacity-90 group-hover:opacity-100 transition-all shadow-xs cursor-pointer"
                    title="Delete uploaded image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-stone-950/80 px-2 py-1.5 text-white">
                    <p className="truncate text-[9px] font-bold">
                      {PRODUCT_IMAGE_ROLES[idx]?.shortLabel || `Image ${idx + 1}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !uploading && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center hover:border-emerald-600 hover:bg-emerald-50/20 transition-colors cursor-pointer group space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-emerald-100 text-stone-500 group-hover:text-emerald-800 flex items-center justify-center mx-auto transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-800 group-hover:text-emerald-900">
                    Click to upload product images
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    PNG, JPG, WebP, or GIF up to 5MB (4 images per product)
                  </p>
                </div>
              </div>
            )
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRODUCT_IMAGE_ROLES.map((role) => (
              <div key={role.slot} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                <p className="text-[10px] font-mono font-bold uppercase text-stone-800">
                  Image {role.slot + 1} · {role.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-stone-500">
                  {role.description}
                </p>
              </div>
            ))}
          </div>

          {errors.images && <p className="text-[11px] text-red-600 font-medium">{errors.images}</p>}
        </div>

        {/* Quality Ranges and Pack-size Variants */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-2">
            <div>
              <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider">
                6. Quality Ranges &amp; Pack Sizes
              </h3>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Add only the quality ranges this product actually has. Maximum three ranges.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddQualityRange}
              disabled={qualityRanges.length >= 3}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add Quality Range
            </button>
          </div>

          <div className="space-y-4">
            {qualityRanges.map((range, rangeIndex) => (
              <section
                key={range.id}
                className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4"
                aria-labelledby={`quality-range-${range.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 pb-3">
                  <div className="flex items-center gap-2">
                    <h4
                      id={`quality-range-${range.id}`}
                      className="text-xs font-mono font-bold uppercase text-stone-700"
                    >
                      Quality Range #{rangeIndex + 1}
                    </h4>
                    {range.requiresManualReview && !range.assuranceTier && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Assurance review required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveQualityRange(rangeIndex, -1)}
                      disabled={rangeIndex === 0}
                      aria-label={`Move quality range ${rangeIndex + 1} up`}
                      className="rounded p-1 text-stone-500 hover:bg-white disabled:opacity-25"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQualityRange(rangeIndex, 1)}
                      disabled={rangeIndex === qualityRanges.length - 1}
                      aria-label={`Move quality range ${rangeIndex + 1} down`}
                      className="rounded p-1 text-stone-500 hover:bg-white disabled:opacity-25"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQualityRange(rangeIndex)}
                      disabled={qualityRanges.length === 1}
                      className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Assurance Tier <span className="text-red-500">*</span>
                    <select
                      value={range.assuranceTier || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'assuranceTier',
                          event.target.value as AssuranceTier
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="" disabled>-- Select Assurance Tier --</option>
                      {SOURCING_TIERS.map((tier) => (
                        <option key={tier} value={tier}>{tier}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-semibold text-stone-700">
                    Cultivation Method <span className="text-red-500">*</span>
                    <select
                      value={range.cultivationMethod}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'cultivationMethod',
                          event.target.value as CultivationMethod
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {CULTIVATION_METHODS.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-semibold text-stone-700">
                    Range Stock <span className="text-red-500">*</span>
                    <select
                      value={range.stockStatus}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'stockStatus',
                          event.target.value as StockStatus
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {STOCK_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex min-h-10 items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={range.active !== false}
                      onChange={(event) =>
                        handleUpdateQualityRange(rangeIndex, 'active', event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-800"
                    />
                    Active quality range
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Source Farm <span className="font-normal text-stone-400">(Optional)</span>
                    <input
                      type="text"
                      value={range.sourceFarm || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(rangeIndex, 'sourceFarm', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-stone-700">
                    Certification Details <span className="font-normal text-stone-400">(Optional)</span>
                    <input
                      type="text"
                      value={range.certificationDetails || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'certificationDetails',
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-stone-700">
                    Certificate URL <span className="font-normal text-stone-400">(Optional)</span>
                    <input
                      type="url"
                      value={range.certificationDocumentUrl || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'certificationDocumentUrl',
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-stone-700">
                    Lab Report URL <span className="font-normal text-stone-400">(Optional)</span>
                    <input
                      type="url"
                      value={range.labReportUrl || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(rangeIndex, 'labReportUrl', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-stone-700">
                    Minimum Order Quantity <span className="font-normal text-stone-400">(Optional)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={range.minimumOrderQuantity ?? ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(
                          rangeIndex,
                          'minimumOrderQuantity',
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-stone-700">
                    Internal Notes <span className="font-normal text-stone-400">(Admin only)</span>
                    <input
                      type="text"
                      value={range.internalNotes || ''}
                      onChange={(event) =>
                        handleUpdateQualityRange(rangeIndex, 'internalNotes', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-mono font-bold uppercase text-stone-700">
                        Pack-size Variants
                      </h5>
                      <p className="mt-0.5 text-[10px] text-stone-500">
                        Pack sizes are range-specific and are not hardcoded.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddVariant(rangeIndex)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Pack Size
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {range.variants.map((variant, variantIndex) => (
                      <div
                        key={variant.id}
                        className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-stone-500">
                            Pack #{variantIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(rangeIndex, variantIndex)}
                            disabled={range.variants.length === 1}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="text-[11px] font-semibold text-stone-700">
                            Pack Label <span className="text-red-500">*</span>
                            <input
                              type="text"
                              value={variant.label}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'label',
                                  event.target.value
                                )
                              }
                              placeholder="e.g. 250 g"
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            Quantity <span className="text-red-500">*</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={variant.quantity ?? ''}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'quantity',
                                  event.target.value
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            Unit <span className="text-red-500">*</span>
                            <input
                              type="text"
                              value={variant.unit || ''}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'unit',
                                  event.target.value
                                )
                              }
                              placeholder="g, kg, bunch"
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            Selling Price (₹) <span className="text-red-500">*</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={variant.sellingPrice ?? variant.price ?? ''}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'sellingPrice',
                                  event.target.value
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            Previous Price (₹) <span className="font-normal text-stone-400">(Optional)</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={variant.previousPrice ?? variant.mrp ?? ''}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'previousPrice',
                                  event.target.value
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            Stock Status <span className="text-red-500">*</span>
                            <select
                              value={variant.stockStatus}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'stockStatus',
                                  event.target.value as StockStatus
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                              {STOCK_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[11px] font-semibold text-stone-700">
                            SKU <span className="font-normal text-stone-400">(Optional)</span>
                            <input
                              type="text"
                              value={variant.sku || ''}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'sku',
                                  event.target.value
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </label>
                          <label className="flex min-h-10 items-center gap-2 self-end rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700">
                            <input
                              type="checkbox"
                              checked={variant.active !== false}
                              onChange={(event) =>
                                handleUpdateVariant(
                                  rangeIndex,
                                  variantIndex,
                                  'active',
                                  event.target.checked
                                )
                              }
                              className="h-4 w-4 accent-emerald-800"
                            />
                            Active pack size
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
          {errors.qualityRanges && (
            <p className="text-[11px] font-semibold text-red-600">
              {errors.qualityRanges}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
};
