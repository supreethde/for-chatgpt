import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Leaf,
  Loader2,
  MapPin,
  ShoppingCart,
} from 'lucide-react';
import { CatalogProduct } from '../../types';
import { getProductGallery } from './productImages';
import { SeoHead } from '../seo/SeoHead';
import { createProductSchemas, getCategorySeoByName } from '../seo/seo';

interface ProductDetailPageProps {
  product: CatalogProduct | null;
  isLoading: boolean;
  priceRange: string;
  farmSource: string;
  weeklyStatus: string;
  currentQuantity: number;
  onBack: () => void;
  onAdd: () => void;
}

export function ProductDetailPage({
  product,
  isLoading,
  priceRange,
  farmSource,
  weeklyStatus,
  currentQuantity,
  onBack,
  onAdd,
}: ProductDetailPageProps) {
  const gallery = useMemo(() => (product ? getProductGallery(product) : []), [product]);
  const schemas = useMemo(() => (product ? createProductSchemas(product) : []), [product]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [product?.slug]);

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

  const selectedImage = gallery[selectedIndex] || gallery[0];
  const categorySeo = getCategorySeoByName(product.category);
  const seoDescription = (product.shortIntro || product.description).slice(0, 160);

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
            Produce Catalogue
          </button>
          <span aria-hidden="true"> / </span>
          <a
            href={`/produce/category/${categorySeo.slug}`}
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
                <div className="aspect-square bg-[#e9e3d5]/50">
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
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-[#183b2b]/10 px-4 py-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f48b4d]">
                    {selectedImage.label}
                  </span>
                  <span className="text-xs text-[#55705c]">
                    {selectedIndex + 1} of {gallery.length}
                  </span>
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
                    className={`overflow-hidden border-2 bg-white text-left transition-colors ${
                      selectedIndex === index
                        ? 'border-[#183b2b]'
                        : 'border-transparent hover:border-[#79966e]'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt=""
                      width={240}
                      height={240}
                      sizes="(max-width: 639px) 22vw, 8rem"
                      loading="lazy"
                      decoding="async"
                      className="aspect-square h-full w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1.5 text-[9px] font-mono font-bold uppercase text-[#55705c]">
                      {image.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <article className="self-start lg:sticky lg:top-6">
            <span className="inline-block bg-[#f48b4d]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f48b4d]">
              {product.category}
            </span>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">
              {product.name}
            </h1>
            {product.scientificName && (
              <p className="mt-2 font-serif text-sm italic text-[#55705c]">
                {product.scientificName}
              </p>
            )}
            <p className="mt-5 text-sm leading-7 text-[#55705c]">{product.description}</p>

            <div className="mt-6 grid gap-3 border-y border-[#183b2b]/15 py-5 text-xs">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[#55705c]">Price</span>
                <strong className="text-right font-mono text-[#183b2b]">{priceRange}</strong>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-[#55705c]">
                  <MapPin className="h-3.5 w-3.5 text-[#f48b4d]" />
                  Source
                </span>
                <strong className="max-w-[65%] text-right text-[#183b2b]">{farmSource}</strong>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-[#55705c]">Weekly test</span>
                <strong className="inline-flex max-w-[65%] items-center gap-1 text-right text-[#3e6927]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {weeklyStatus}
                </strong>
              </div>
            </div>

            {product.highlights?.length > 0 && (
              <section className="mt-6" aria-labelledby="product-highlights-heading">
                <h2 id="product-highlights-heading" className="text-xs font-mono font-bold uppercase tracking-wider">
                  Product highlights
                </h2>
                <ul className="mt-3 grid gap-2">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm text-[#55705c]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#79966e]" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {product.variants?.length > 0 && (
              <section className="mt-6" aria-labelledby="available-packs-heading">
                <h2 id="available-packs-heading" className="text-xs font-mono font-bold uppercase tracking-wider">
                  Available packs
                </h2>
                <div className="mt-3 grid gap-2">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between border border-[#183b2b]/15 bg-white px-3 py-2.5 text-xs"
                    >
                      <span>
                        <strong>{variant.label}</strong>
                        {variant.sourcingTier ? (
                          <span className="ml-2 text-[#55705c]">{variant.sourcingTier}</span>
                        ) : null}
                      </span>
                      <span className="font-mono font-bold">
                        ₹{variant.sellingPrice ?? variant.price ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={onAdd}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#183b2b] px-5 py-3 text-sm font-bold text-[#c9dc74] transition-colors hover:bg-[#25543e]"
            >
              <ShoppingCart className="h-4 w-4" />
              Add 10kg to inquiry {currentQuantity > 0 ? `(${currentQuantity}kg selected)` : ''}
            </button>
          </article>
        </div>
      </main>
    </div>
  );
}
