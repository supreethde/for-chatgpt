import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Leaf,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { CatalogProduct, ProductSelection } from '../../types';
import { ProductCard } from './ProductCard';
import { getProductGallery } from './productImages';
import { SeoHead } from '../seo/SeoHead';
import { createProductSchemas, getCategorySeoByName } from '../seo/seo';
import {
  getActiveQualityRanges,
  getActiveVariants,
  getDefaultProductSelection,
  getQualityRangeDisplayLabel,
  isQualityRangeAvailable,
} from './productModel';

interface ProductDetailPageProps {
  product: CatalogProduct | null;
  isLoading: boolean;
  priceRange: string;
  currentQuantity: number;
  products: CatalogProduct[];
  quantities: Record<string, number>;
  getPriceRange: (product: CatalogProduct) => string;
  getFarmSource: (product: CatalogProduct) => string;
  getWeeklyStatus: (product: CatalogProduct) => string;
  getDescription: (product: CatalogProduct) => string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onAdd: (selection: ProductSelection) => void;
  onAddProduct: (product: CatalogProduct, selection: ProductSelection) => void;
}

export function ProductDetailPage({
  product,
  isLoading,
  priceRange,
  currentQuantity,
  products,
  quantities,
  getPriceRange,
  getFarmSource,
  getWeeklyStatus,
  getDescription,
  onBack,
  onNavigate,
  onAdd,
  onAddProduct,
}: ProductDetailPageProps) {
  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const schemas = useMemo(() => (product ? createProductSchemas(product) : []), [product]);
  const relatedProducts = useMemo(() => {
    if (!product) return [];

    return products
      .filter((item) => {
        const activeState =
          item.isActive ?? (item as CatalogProduct & { active?: boolean }).active ?? true;
        return (
          activeState !== false &&
          item.id !== product.id &&
          item.category === product.category
        );
      })
      .slice(0, 4);
  }, [product, products]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedRangeId, setSelectedRangeId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [openInfoSections, setOpenInfoSections] = useState({
    about: true,
    highlights: false,
    transparency: false,
  });
  const [isMobileInfoLayout, setIsMobileInfoLayout] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches
  );
  const selectedImage = gallery[selectedIndex] || gallery[0];
  const [primaryImageLoaded, setPrimaryImageLoaded] = useState(false);
  const [primaryImageFailed, setPrimaryImageFailed] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
    const initialSelection = product ? getDefaultProductSelection(product) : null;
    setSelectedRangeId(initialSelection?.qualityRangeId ?? '');
    setSelectedVariantId(initialSelection?.variantId ?? '');
    setQuantity(initialSelection?.quantity ?? 1);
    setOpenInfoSections({
      about: true,
      highlights: false,
      transparency: false,
    });
  }, [product?.slug]);

  useEffect(() => {
    setPrimaryImageLoaded(false);
    setPrimaryImageFailed(false);
  }, [selectedImage?.url]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const updateMobileLayout = () => setIsMobileInfoLayout(mobileQuery.matches);

    updateMobileLayout();
    mobileQuery.addEventListener('change', updateMobileLayout);

    return () => mobileQuery.removeEventListener('change', updateMobileLayout);
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e7] text-[#183b2b]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#79966e]" />
          <p className="mt-3 text-xs font-mono">Loading produce details…</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e7] p-6 text-[#183b2b]">
        <div className="max-w-lg border border-[#183b2b]/20 bg-white p-8 text-center">
          <Leaf className="mx-auto h-9 w-9 text-[#79966e]" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl font-bold">Produce not found</h1>
          <p className="mt-2 text-sm text-[#55705c]">
            This item may be seasonal, inactive, or no longer available.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[#183b2b] px-5 py-3 text-xs font-bold text-[#c9dc74]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalogue
          </button>
        </div>
      </main>
    );
  }

  const qualityRanges = getActiveQualityRanges(product);
  const selectedRange =
    qualityRanges.find((range) => range.id === selectedRangeId) ??
    qualityRanges.find(isQualityRangeAvailable) ??
    qualityRanges[0];
  const variants = selectedRange ? getActiveVariants(selectedRange) : [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.stockStatus !== 'out_of_stock') ??
    variants[0];
  const selectedPrice = selectedVariant
    ? selectedVariant.sellingPrice ?? selectedVariant.price
    : undefined;
  const isAvailable =
    Boolean(selectedRange) &&
    Boolean(selectedVariant) &&
    isQualityRangeAvailable(selectedRange) &&
    selectedVariant?.stockStatus !== 'out_of_stock';
  const regionalNames = [
    product.regionalNameKannada?.trim(),
    product.regionalNameHindi?.trim(),
  ].filter((name): name is string => Boolean(name));
  const highlights = (product.highlights ?? []).filter((highlight) =>
    Boolean(highlight?.trim())
  );
  const transparencyDetails = [
    selectedRange?.sourceFarm?.trim()
      ? { label: 'Source', value: selectedRange.sourceFarm.trim() }
      : null,
    selectedRange?.certificationDetails?.trim()
      ? { label: 'Certification', value: selectedRange.certificationDetails.trim() }
      : null,
    selectedRange
      ? { label: 'Cultivation', value: selectedRange.cultivationMethod }
      : null,
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail));
  const minimumOrderQuantity = Math.max(
    1,
    Math.floor(selectedRange?.minimumOrderQuantity || 1)
  );
  const categorySeo = getCategorySeoByName(product.category);
  const seoDescription = (product.shortIntro || product.description).slice(0, 160);
  const selectQualityRange = (rangeId: string) => {
    const range = qualityRanges.find((item) => item.id === rangeId);
    if (!range) return;
    const rangeVariants = getActiveVariants(range);
    const initialVariant =
      rangeVariants.find((variant) => variant.stockStatus !== 'out_of_stock') ??
      rangeVariants[0];
    setSelectedRangeId(range.id);
    setSelectedVariantId(initialVariant?.id ?? '');
    setQuantity(Math.max(1, Math.floor(range.minimumOrderQuantity || 1)));
  };
  const toggleInfoSection = (
    section: keyof typeof openInfoSections
  ) => {
    setOpenInfoSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  return (
    <div className="min-h-screen bg-[#f4f0e7] text-[#183b2b]">
      <SeoHead
        title={`${product.name} for Bengaluru Professional Kitchens`}
        description={seoDescription}
        canonicalPath={`/produce/${encodeURIComponent(product.slug)}`}
        image={product.images?.[1] || product.images?.[0]}
        type="product"
        schemas={schemas}
      />

      <header className="border-b border-[#183b2b]/15 bg-[#183b2b] text-[#f4f0e7]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-[#c9dc74] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to catalogue
          </button>
          <span className="font-serif text-lg font-bold tracking-wide">THE SOIL THEORY</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-[11px] font-mono text-[#55705c]">
          <button type="button" onClick={onBack} className="hover:text-[#183b2b] hover:underline">
            Shop
          </button>
          <span aria-hidden="true"> / </span>
          <a
            href={`/${categorySeo.slug}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(`/${categorySeo.slug}`);
            }}
            className="hover:text-[#183b2b] hover:underline"
          >
            {product.category}
          </a>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
          <section aria-label={`${product.name} image gallery`}>
            {selectedImage ? (
              <figure className="overflow-hidden border border-[#183b2b]/15 bg-white">
                <div className="relative aspect-square bg-[#e9e3d5]/50 p-5">
                  {!primaryImageLoaded && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 animate-pulse bg-[#e9e3d5]/70 motion-reduce:animate-none"
                    />
                  )}
                  {primaryImageFailed && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-[#79966e]">
                      <Leaf className="h-10 w-10" aria-hidden="true" />
                      <span className="text-xs font-mono">Image coming soon</span>
                    </span>
                  )}
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.alt}
                    title={selectedImage.title}
                    width={1200}
                    height={1200}
                    sizes="(max-width: 1023px) calc(100vw - 2rem), 55vw"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={() => setPrimaryImageLoaded(true)}
                    onError={() => {
                      setPrimaryImageFailed(true);
                      setPrimaryImageLoaded(true);
                    }}
                    className={`h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${
                      primaryImageLoaded && !primaryImageFailed
                        ? 'opacity-100'
                        : 'opacity-0'
                    }`}
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-[#183b2b]/10 px-4 py-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f48b4d]">
                    {selectedImage.label}
                  </span>
                  {gallery.length > 1 && (
                    <span className="text-xs text-[#55705c]">
                      {selectedIndex + 1} of {gallery.length}
                    </span>
                  )}
                </figcaption>
              </figure>
            ) : (
              <div className="flex aspect-square items-center justify-center border border-[#183b2b]/15 bg-white text-[#79966e]">
                <div className="text-center">
                  <Leaf className="mx-auto h-10 w-10" />
                  <p className="mt-2 text-xs font-mono">Image coming soon</p>
                </div>
              </div>
            )}

            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2" role="list" aria-label="Product gallery thumbnails">
                {gallery.map((image, index) => (
                  <button
                    key={`${image.slot}-${image.url}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`View ${image.label}`}
                    aria-pressed={selectedIndex === index}
                    className={`overflow-hidden border-2 bg-white text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] ${
                      selectedIndex === index
                        ? 'border-[#183b2b]'
                        : 'border-transparent hover:border-[#79966e]'
                    }`}
                  >
                    <span className="block aspect-square bg-[#f4f0e7] p-2">
                      <img
                        src={image.url}
                        alt=""
                        width={240}
                        height={240}
                        sizes="(max-width: 639px) 22vw, 8rem"
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <span className="block truncate px-2 py-1.5 text-[9px] font-mono font-bold uppercase text-[#55705c]">
                      {image.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <article className="self-start border border-[#183b2b]/15 bg-white p-5 sm:p-7">
            <span className="inline-block bg-[#f48b4d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f48b4d]">
              {product.category}
            </span>
            <h1 className="mt-3 break-words font-serif text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
              {product.name}
            </h1>

            {regionalNames.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-[#55705c]">
                {regionalNames.join(' · ')}
              </p>
            )}
            {product.scientificName?.trim() && (
              <p className="mt-1 font-serif text-sm italic text-[#79966e]">
                {product.scientificName}
              </p>
            )}
            {product.shortIntro?.trim() && (
              <p className="mt-5 text-sm leading-7 text-[#55705c]">
                {product.shortIntro}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-[#183b2b]/15 py-4 text-xs">
              {selectedRange && (
                <span className="inline-flex items-center gap-1.5 bg-[#79966e]/10 px-2.5 py-1.5 font-semibold text-[#3e6927]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {getQualityRangeDisplayLabel(selectedRange)}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-2 font-semibold ${
                  isAvailable ? 'text-[#3e6927]' : 'text-[#f48b4d]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isAvailable ? 'bg-[#79966e]' : 'bg-[#f48b4d]'
                  }`}
                  aria-hidden="true"
                />
                {isAvailable ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {qualityRanges.length > 0 && (
              <section className="mt-6" aria-labelledby="quality-range-heading">
                <h2
                  id="quality-range-heading"
                  className="!text-xs !leading-4 font-mono font-bold uppercase tracking-wider"
                >
                  Choose quality range
                </h2>
                <div
                  className="mt-3 grid gap-2"
                  role="radiogroup"
                  aria-label="Quality range"
                >
                  {qualityRanges.map((range) => {
                    const isSelected = selectedRange?.id === range.id;
                    const rangeAvailable = isQualityRangeAvailable(range);
                    return (
                      <button
                        key={range.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${getQualityRangeDisplayLabel(range)}, ${range.cultivationMethod}, ${
                          rangeAvailable ? 'available' : 'out of stock'
                        }`}
                        onClick={() => selectQualityRange(range.id)}
                        className={`flex min-h-14 items-center justify-between gap-4 border px-3 py-2.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] ${
                          isSelected
                            ? 'border-[#183b2b] bg-[#183b2b] text-[#f4f0e7]'
                            : 'border-[#183b2b]/15 bg-[#f4f0e7] text-[#183b2b] hover:border-[#79966e]'
                        }`}
                      >
                        <span>
                          <strong className="block">
                            {range.assuranceTier || 'Quality details available on request'}
                          </strong>
                          <span
                            className={`mt-1 block text-[11px] ${
                              isSelected ? 'text-[#e9e3d5]' : 'text-[#55705c]'
                            }`}
                          >
                            {range.cultivationMethod}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold">
                          {rangeAvailable ? 'Available' : 'Out of Stock'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {variants.length > 0 && (
              <section className="mt-6" aria-labelledby="available-packs-heading">
                <h2
                  id="available-packs-heading"
                  className="!text-xs !leading-4 font-mono font-bold uppercase tracking-wider"
                >
                  Choose pack size
                </h2>
                <div
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Pack size"
                >
                  {variants.map((variant) => {
                    const variantPrice = variant.sellingPrice ?? variant.price;
                    const variantAvailable = variant.stockStatus !== 'out_of_stock';
                    const isSelected = selectedVariant?.id === variant.id;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={!variantAvailable}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`flex min-h-12 items-center justify-between gap-3 border px-3 py-2.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] disabled:cursor-not-allowed disabled:opacity-45 ${
                          isSelected
                            ? 'border-[#183b2b] bg-[#183b2b] text-[#f4f0e7]'
                            : 'border-[#183b2b]/15 bg-[#f4f0e7] text-[#183b2b] hover:border-[#79966e]'
                        }`}
                      >
                        <strong>{variant.label}</strong>
                        {typeof variantPrice === 'number' && (
                          <span className="shrink-0 font-mono font-bold">
                            ₹{variantPrice}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#79966e]">
                  Price
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-[#183b2b]" aria-live="polite">
                  {typeof selectedPrice === 'number' ? `₹${selectedPrice}` : priceRange}
                </p>
              </div>
              {selectedVariant && (
                <span className="pb-1 text-xs font-semibold text-[#55705c]">
                  {selectedVariant.label}
                </span>
              )}
            </div>

            <div className="mt-6">
              <p className="text-xs font-mono font-bold uppercase tracking-wider">
                Quantity
              </p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="inline-flex min-h-11 items-center border border-[#183b2b]/20 bg-[#f4f0e7]">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.max(minimumOrderQuantity, current - 1)
                      )
                    }
                    disabled={!isAvailable || quantity <= minimumOrderQuantity}
                    aria-label="Decrease pack quantity"
                    className="inline-flex h-11 w-11 items-center justify-center text-[#183b2b] hover:bg-[#e9e3d5] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <output
                    aria-live="polite"
                    className="min-w-20 px-3 text-center font-mono text-sm font-bold"
                  >
                    {quantity}
                  </output>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    disabled={!isAvailable}
                    aria-label="Increase pack quantity"
                    className="inline-flex h-11 w-11 items-center justify-center text-[#183b2b] hover:bg-[#e9e3d5] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {currentQuantity > 0 && (
                  <span className="text-right text-xs text-[#55705c]">
                    {currentQuantity} already selected
                  </span>
                )}
              </div>
              {selectedRange?.minimumOrderQuantity && (
                <p className="mt-2 text-[11px] text-[#55705c]">
                  Minimum order: {minimumOrderQuantity}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedRange || !selectedVariant) return;
                onAdd({
                  qualityRangeId: selectedRange.id,
                  variantId: selectedVariant.id,
                  quantity,
                });
              }}
              disabled={!isAvailable}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#183b2b] px-5 py-3 text-sm font-bold text-[#c9dc74] transition-colors hover:bg-[#25543e] disabled:cursor-not-allowed disabled:bg-[#183b2b]/35 disabled:text-[#f4f0e7]"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              {isAvailable
                ? `Add ${quantity} × ${selectedVariant?.label || 'pack'} to inquiry`
                : 'Out of Stock'}
            </button>
          </article>
        </div>

        {(product.description?.trim() ||
          highlights.length > 0 ||
          transparencyDetails.length > 0 ||
          selectedRange?.certificationDocumentUrl ||
          selectedRange?.labReportUrl) && (
          <div className="mt-12 grid gap-8 border-t border-[#183b2b]/15 pt-10 lg:grid-cols-3">
            {product.description?.trim() && (
              <section
                className="border-b border-[#183b2b]/15 pb-4 md:border-0 md:pb-0 lg:col-span-2"
                aria-label="About this product"
              >
                <button
                  type="button"
                  aria-expanded={openInfoSections.about}
                  aria-controls="about-product-content"
                  onClick={() => toggleInfoSection('about')}
                  className="flex min-h-12 w-full items-center justify-between gap-4 text-left font-serif text-xl font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] md:hidden"
                >
                  About this product
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                      openInfoSections.about ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <p className="eyebrow mb-3 hidden md:block">Product details</p>
                <h2
                  id="about-product-heading"
                  className="hidden font-serif !text-3xl !leading-tight font-bold md:block"
                >
                  About this product
                </h2>
                <div
                  id="about-product-content"
                  aria-hidden={isMobileInfoLayout && !openInfoSections.about}
                  inert={isMobileInfoLayout && !openInfoSections.about}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 md:block md:opacity-100 ${
                    openInfoSections.about
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden md:overflow-visible">
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#55705c] md:mt-4">
                      {product.description}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {highlights.length > 0 && (
              <section
                className="border-b border-[#183b2b]/15 pb-4 md:border-0 md:pb-0"
                aria-label="Key highlights"
              >
                <button
                  type="button"
                  aria-expanded={openInfoSections.highlights}
                  aria-controls="product-highlights-content"
                  onClick={() => toggleInfoSection('highlights')}
                  className="flex min-h-12 w-full items-center justify-between gap-4 text-left font-serif text-xl font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] md:hidden"
                >
                  Key highlights
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                      openInfoSections.highlights ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <h2
                  id="product-highlights-heading"
                  className="hidden font-serif !text-2xl !leading-tight font-bold md:block"
                >
                  Key highlights
                </h2>
                <div
                  id="product-highlights-content"
                  aria-hidden={isMobileInfoLayout && !openInfoSections.highlights}
                  inert={isMobileInfoLayout && !openInfoSections.highlights}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 md:block md:opacity-100 ${
                    openInfoSections.highlights
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden md:overflow-visible">
                    <ul className="mt-3 grid gap-3 md:mt-4">
                      {highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="flex items-start gap-2 text-sm leading-6 text-[#55705c]"
                        >
                          <CheckCircle2
                            className="mt-1 h-4 w-4 shrink-0 text-[#79966e]"
                            aria-hidden="true"
                          />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {(transparencyDetails.length > 0 ||
              selectedRange?.certificationDocumentUrl ||
              selectedRange?.labReportUrl) && (
              <section
                className="border-t border-[#183b2b]/15 pt-8 lg:col-span-3"
                aria-label="Sourcing and transparency"
              >
                <button
                  type="button"
                  aria-expanded={openInfoSections.transparency}
                  aria-controls="product-transparency-content"
                  onClick={() => toggleInfoSection('transparency')}
                  className="flex min-h-12 w-full items-center justify-between gap-4 text-left font-serif text-xl font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b2b] md:hidden"
                >
                  Sourcing &amp; transparency
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                      openInfoSections.transparency ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <h2
                  id="product-transparency-heading"
                  className="hidden font-serif !text-2xl !leading-tight font-bold md:block"
                >
                  Sourcing &amp; transparency
                </h2>
                <div
                  id="product-transparency-content"
                  aria-hidden={isMobileInfoLayout && !openInfoSections.transparency}
                  inert={isMobileInfoLayout && !openInfoSections.transparency}
                  className={`grid transition-[grid-template-rows,opacity] duration-200 md:block md:opacity-100 ${
                    openInfoSections.transparency
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden md:overflow-visible">
                    <dl className="mt-3 grid gap-4 sm:grid-cols-2 md:mt-4 lg:grid-cols-3">
                      {transparencyDetails.map((detail) => (
                        <div
                          key={`${detail.label}-${detail.value}`}
                          className="border border-[#183b2b]/15 bg-white p-4"
                        >
                          <dt className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#79966e]">
                            {detail.label}
                          </dt>
                          <dd className="mt-2 text-sm leading-6 text-[#183b2b]">
                            {detail.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {(selectedRange?.certificationDocumentUrl ||
                      selectedRange?.labReportUrl) && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {selectedRange.certificationDocumentUrl && (
                          <a
                            href={selectedRange.certificationDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center border border-[#183b2b]/20 px-4 py-2 text-xs font-bold text-[#183b2b] hover:border-[#183b2b]"
                          >
                            View certificate
                          </a>
                        )}
                        {selectedRange.labReportUrl && (
                          <a
                            href={selectedRange.labReportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center border border-[#183b2b]/20 px-4 py-2 text-xs font-bold text-[#183b2b] hover:border-[#183b2b]"
                          >
                            View lab report
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {relatedProducts.length > 0 && (
          <section
            className="mt-14 border-t border-[#183b2b]/15 pt-10"
            aria-labelledby="related-products-heading"
          >
            <p className="eyebrow mb-3">More from this category</p>
            <h2
              id="related-products-heading"
              className="font-serif !text-3xl !leading-tight font-bold"
            >
              Related Products
            </h2>
            <div className="related-products-grid mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((relatedProduct) => {
                const relatedHref = `/produce/${encodeURIComponent(
                  relatedProduct.slug
                )}`;

                return (
                  <ProductCard
                    key={relatedProduct.id}
                    product={relatedProduct}
                    productHref={relatedHref}
                    priceRange={getPriceRange(relatedProduct)}
                    farmSource={getFarmSource(relatedProduct)}
                    weeklyStatus={getWeeklyStatus(relatedProduct)}
                    description={getDescription(relatedProduct)}
                    currentQuantity={quantities[relatedProduct.id] || 0}
                    imagePriority={false}
                    onOpen={() => onNavigate(relatedHref)}
                    onAdd={() => {
                      const selection = getDefaultProductSelection(relatedProduct);
                      if (selection) onAddProduct(relatedProduct, selection);
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
