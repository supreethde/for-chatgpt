import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { CatalogProduct } from '../../types';
import { getProductImageAlt } from './productImages';

interface ProductCardProps {
  key?: React.Key;
  product: CatalogProduct;
  priceRange: string;
  farmSource: string;
  weeklyStatus: string;
  description: string;
  currentQuantity: number;
  productHref: string;
  onOpen: () => void;
  onAdd: () => void;
}

export function ProductCard({
  product,
  priceRange,
  farmSource,
  weeklyStatus,
  description,
  currentQuantity,
  productHref,
  onOpen,
  onAdd,
}: ProductCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [showRealImageOnMobile, setShowRealImageOnMobile] = useState(false);
  const botanicalImage = product.images?.[0];
  const realProductImage = product.images?.[1];

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !realProductImage || typeof IntersectionObserver === 'undefined') return;

    const mobileQuery = window.matchMedia('(max-width: 767px)');
    let observer: IntersectionObserver | null = null;

    const updateObserver = () => {
      observer?.disconnect();
      observer = null;
      setShowRealImageOnMobile(false);

      if (!mobileQuery.matches) return;

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            setShowRealImageOnMobile(true);
          } else if (!entry.isIntersecting) {
            setShowRealImageOnMobile(false);
          }
        },
        { threshold: [0, 0.65, 1] }
      );

      observer.observe(card);
    };

    updateObserver();
    mobileQuery.addEventListener('change', updateObserver);

    return () => {
      observer?.disconnect();
      mobileQuery.removeEventListener('change', updateObserver);
    };
  }, [realProductImage]);

  return (
    <article
      ref={cardRef}
      className="group flex cursor-pointer flex-col justify-between border border-[#e9e3d5] bg-white p-5 transition-all hover:shadow-lg"
      onClick={onOpen}
    >
      <div>
        {botanicalImage && (
          <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-[#f4f0e7]">
            <img
              src={botanicalImage}
              alt={getProductImageAlt(product, 0)}
              title={`Botanical illustration of ${product.name}`}
              width={800}
              height={600}
              sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) 50vw, 25vw"
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[400ms] ease-out md:group-hover:opacity-0 ${
                showRealImageOnMobile ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {realProductImage && (
              <img
                src={realProductImage}
                alt={getProductImageAlt(product, 1)}
                title={`Fresh ${product.name}`}
                width={800}
                height={600}
                sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) 50vw, 25vw"
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[400ms] ease-out md:opacity-0 md:group-hover:opacity-100 ${
                  showRealImageOnMobile ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
          </div>
        )}

        <div className="mb-2 flex items-start justify-between gap-4">
          <span className="bg-[#f48b4d]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f48b4d]">
            {product.category}
          </span>
          <span className="text-xs font-mono font-bold text-[#183b2b]">{priceRange}</span>
        </div>

        <h3 className="mb-1 font-serif text-xl font-bold">
          <a
            href={productHref}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpen();
            }}
            className="text-[#183b2b] transition-colors group-hover:text-[#79966e]"
          >
            {product.name}
          </a>
        </h3>
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-[#55705c]">{description}</p>
      </div>

      <div className="mt-2 border-t border-[#e9e3d5] pt-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2 text-xs text-[#55705c]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#f48b4d]" aria-hidden="true" />
          <span className="truncate">
            Source: <strong>{farmSource}</strong>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#e9e3d5]/50 pt-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#3e6927]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {weeklyStatus}
          </span>

          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 bg-[#183b2b] px-3 py-1.5 text-xs font-bold text-[#c9dc74] transition-all hover:bg-[#79966e]"
          >
            + Add 10kg {currentQuantity > 0 ? `(${currentQuantity}kg)` : ''}
          </button>
        </div>
      </div>
    </article>
  );
}
