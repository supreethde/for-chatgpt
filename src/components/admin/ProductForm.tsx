import React, { useState, useEffect, useRef } from 'react';
import { CatalogProduct, ProductCategory, ProductVariant, StockStatus, SOURCING_TIERS, SourcingTier } from '../../types';
import { Plus, Trash2, X, Image as ImageIcon, AlertCircle, Check, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { auth } from '../../lib/firebase';

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
  
  // Up to 5 image URLs from Firebase Storage
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length > 0 ? [...product.images] : []
  );

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Pack-size variants
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants && product.variants.length > 0
      ? product.variants.map((v, i) => ({
          id: v.id || 'var-' + Date.now() + '-' + (i + 1),
          sourcingTier: v.sourcingTier,
          label: v.label || '',
          sellingPrice: typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 99),
          previousPrice: typeof v.previousPrice === 'number' ? v.previousPrice : (typeof v.mrp === 'number' ? v.mrp : undefined),
          stockStatus: v.stockStatus || 'in_stock',
          note: v.note || '',
          price: typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 99),
          mrp: typeof v.previousPrice === 'number' ? v.previousPrice : (typeof v.mrp === 'number' ? v.mrp : undefined),
        }))
      : [
          {
            id: 'var-' + Date.now() + '-1',
            sourcingTier: 'Certified Organic',
            label: '250 g',
            sellingPrice: 99,
            previousPrice: 120,
            stockStatus: 'in_stock',
            note: '',
            price: 99,
            mrp: 120,
          },
        ]
  );

  const [isActive, setIsActive] = useState<boolean>(product?.isActive ?? true);
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

  // Image Upload Handler using Server Admin API (/api/admin/upload)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUploadError('You must be signed in as an administrator to upload images.');
      if (e.target) e.target.value = '';
      return;
    }

    const maxAllowed = 5;
    const currentCount = images.length;
    const availableSlots = maxAllowed - currentCount;

    if (availableSlots <= 0) {
      setUploadError('Maximum limit of 5 images per product reached.');
      if (e.target) e.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const newUploadedUrls: string[] = [];

    try {
      const idToken = await currentUser.getIdToken();

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatusText(`Uploading image ${i + 1} of ${selectedFiles.length}...`);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/admin/upload');
          xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const filePercent = event.loaded / event.total;
              const overallPercent = Math.round(
                ((i + filePercent) / selectedFiles.length) * 100
              );
              setUploadProgress(overallPercent);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.downloadURL) {
                  newUploadedUrls.push(data.downloadURL);
                  resolve();
                } else {
                  reject(new Error('Invalid response from upload server.'));
                }
              } catch {
                reject(new Error('Failed to parse server response.'));
              }
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error occurred during image upload.'));
          };

          const formData = new FormData();
          formData.append('file', file);
          xhr.send(formData);
        });
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

  // Variant handlers
  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        id: 'var-' + Date.now() + '-' + (variants.length + 1),
        sourcingTier: variants[variants.length - 1]?.sourcingTier || 'Certified Organic',
        label: '500 g',
        sellingPrice: 150,
        previousPrice: 180,
        stockStatus: 'in_stock',
        note: '',
        price: 150,
        mrp: 180,
      },
    ]);
  };

  const handleUpdateVariant = (
    index: number,
    field: keyof ProductVariant | 'price' | 'mrp',
    value: any
  ) => {
    const updated = [...variants];
    const target = { ...updated[index] };

    if (field === 'sellingPrice' || field === 'price') {
      const num = value === '' ? ('' as any) : Number(value);
      target.sellingPrice = num;
      target.price = num;
    } else if (field === 'previousPrice' || field === 'mrp') {
      const num = value === '' ? undefined : Number(value);
      target.previousPrice = num;
      target.mrp = num;
    } else {
      (target as any)[field] = value;
    }

    updated[index] = target;
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!slug.trim()) newErrors.slug = 'URL slug is required';
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

    if (images.length === 0) {
      newErrors.images = 'At least 1 product image is required. Please upload an image.';
    }
    if (uploading) {
      newErrors.images = 'Please wait for image upload to complete.';
    }

    if (variants.length === 0) {
      newErrors.variants = 'At least 1 pack-size variant is required';
    } else {
      const comboSet = new Set<string>();

      variants.forEach((v, idx) => {
        if (!v.sourcingTier) {
          newErrors[`variant_tier_${idx}`] = 'Please select a Sourcing Tier';
        }
        if (!v.label || !v.label.trim()) {
          newErrors[`variant_label_${idx}`] = 'Pack size is required';
        }

        const currentPrice = v.sellingPrice ?? v.price;
        if (
          currentPrice === undefined ||
          currentPrice === null ||
          currentPrice === ('' as any) ||
          isNaN(Number(currentPrice)) ||
          Number(currentPrice) <= 0
        ) {
          newErrors[`variant_price_${idx}`] = 'Valid selling price required';
        }

        // Check duplicate (Sourcing Tier + Pack Size) combination
        if (v.sourcingTier && v.label && v.label.trim()) {
          const comboKey = `${v.sourcingTier.trim().toLowerCase()}:::${v.label.trim().toLowerCase()}`;
          if (comboSet.has(comboKey)) {
            newErrors[`variant_duplicate_${idx}`] = `Duplicate option: "${v.sourcingTier}" with "${v.label.trim()}". Each variant option must be unique.`;
            newErrors.variants = 'Duplicate variants found. Please ensure each Sourcing Tier + Pack Size combination is unique.';
          } else {
            comboSet.add(comboKey);
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanedImages = images.filter((img) => img.trim().length > 0);

    const formattedVariants: ProductVariant[] = variants.map((v) => {
      const sellPrice = Number(v.sellingPrice ?? v.price ?? 0);
      const prevPrice = v.previousPrice !== undefined && v.previousPrice !== null && v.previousPrice !== ('' as any)
        ? Number(v.previousPrice)
        : (v.mrp !== undefined && v.mrp !== null && v.mrp !== ('' as any) ? Number(v.mrp) : undefined);

      return {
        id: v.id || 'var-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        sourcingTier: v.sourcingTier!,
        label: v.label.trim(),
        sellingPrice: sellPrice,
        ...(prevPrice !== undefined && !isNaN(prevPrice) ? { previousPrice: prevPrice } : {}),
        stockStatus: v.stockStatus || 'in_stock',
        ...(v.note && v.note.trim() ? { note: v.note.trim() } : {}),
        price: sellPrice,
        ...(prevPrice !== undefined && !isNaN(prevPrice) ? { mrp: prevPrice } : {}),
      };
    });

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
      variants: formattedVariants,
      isActive,
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
                5. Product Images (Up to 5)
              </h3>
              <p className="text-[11px] text-stone-500">
                Upload images from your computer directly to Firebase Storage ({images.length}/5 uploaded)
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
              disabled={images.length >= 5 || uploading}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="group relative bg-stone-100 border border-stone-200 rounded-xl overflow-hidden aspect-square flex items-center justify-center shadow-xs"
                >
                  <img
                    src={imgUrl}
                    alt={`Product Image ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />

                  {/* Badge */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-stone-900/80 text-white text-[10px] font-mono rounded backdrop-blur-xs">
                    {idx === 0 ? 'Main' : `#${idx + 1}`}
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
                    PNG, JPG, or WebP up to 5MB (Max 5 images per product)
                  </p>
                </div>
              </div>
            )
          )}

          {errors.images && <p className="text-[11px] text-red-600 font-medium">{errors.images}</p>}
        </div>

        {/* Pack-size Variants */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-mono font-bold text-stone-900 uppercase tracking-wider">
                6. Pack-size Variants
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Each variant represents one complete purchasable product option (Sourcing Tier + Pack Size).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={v.id || idx}
                className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 relative group"
              >
                {/* Variant Item Header */}
                <div className="flex justify-between items-center border-b border-stone-200/70 pb-2">
                  <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                    Variant #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    disabled={variants.length === 1}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer"
                    title="Remove variant"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                {/* Primary Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
                  {/* 1. Sourcing Tier */}
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Sourcing Tier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={v.sourcingTier || ''}
                      onChange={(e) => handleUpdateVariant(idx, 'sourcingTier', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                        errors[`variant_tier_${idx}`] ? 'border-red-500 bg-red-50/50' : 'border-stone-300 bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-stone-800`}
                    >
                      <option value="" disabled>-- Select Sourcing Tier --</option>
                      {SOURCING_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                    {errors[`variant_tier_${idx}`] && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors[`variant_tier_${idx}`]}</p>
                    )}
                  </div>

                  {/* 2. Pack Size */}
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Pack Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={v.label}
                      onChange={(e) => handleUpdateVariant(idx, 'label', e.target.value)}
                      placeholder="e.g. 250 g, 1 kg"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                        errors[`variant_label_${idx}`] ? 'border-red-500 bg-red-50/50' : 'border-stone-300 bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600`}
                    />
                    {errors[`variant_label_${idx}`] && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors[`variant_label_${idx}`]}</p>
                    )}
                  </div>

                  {/* 3. Selling Price */}
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={v.sellingPrice ?? v.price ?? ''}
                      onChange={(e) => handleUpdateVariant(idx, 'sellingPrice', e.target.value)}
                      placeholder="99"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                        errors[`variant_price_${idx}`] ? 'border-red-500 bg-red-50/50' : 'border-stone-300 bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono`}
                    />
                    {errors[`variant_price_${idx}`] && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errors[`variant_price_${idx}`]}</p>
                    )}
                  </div>

                  {/* 4. Previous Price */}
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Previous Price (₹) <span className="text-stone-400 font-normal">(Opt)</span>
                    </label>
                    <input
                      type="number"
                      value={v.previousPrice ?? v.mrp ?? ''}
                      onChange={(e) => handleUpdateVariant(idx, 'previousPrice', e.target.value)}
                      placeholder="120"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white font-mono"
                    />
                  </div>

                  {/* 5. Stock Status */}
                  <div className="lg:col-span-1">
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Stock Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={v.stockStatus}
                      onChange={(e) => handleUpdateVariant(idx, 'stockStatus', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white font-medium"
                    >
                      {STOCK_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Growing Method / Note */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Growing Method / Note <span className="text-stone-400 font-normal">(Optional e.g. Hydroponically Grown, Soil Grown, Greenhouse Grown, Naturally Ripened)</span>
                  </label>
                  <input
                    type="text"
                    value={v.note || ''}
                    onChange={(e) => handleUpdateVariant(idx, 'note', e.target.value)}
                    placeholder="e.g. Hydroponically Grown, Soil Grown, Greenhouse Grown..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                  />
                </div>

                {errors[`variant_duplicate_${idx}`] && (
                  <p className="text-[11px] font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                    {errors[`variant_duplicate_${idx}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
          {errors.variants && <p className="text-[11px] text-red-600 font-semibold">{errors.variants}</p>}
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
