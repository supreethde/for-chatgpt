import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CatalogProduct } from '../../types';
import { getProductImageAlt } from './productImages';

const FIRST_IMAGE_DELAY_MS = 5_000;
const LATER_IMAGE_DELAY_MS = 4_000;
const FADE_DURATION_MS = 600;
const SWIPE_THRESHOLD_PX = 40;

function isDesktopHoverEnvironment() {
  return window.matchMedia(
    '(min-width: 768px) and (hover: hover) and (pointer: fine)'
  ).matches;
}

function isSwipePointer(event: React.PointerEvent<HTMLDivElement>) {
  return (
    event.pointerType !== 'mouse' ||
    window.matchMedia('(max-width: 767px)').matches
  );
}

function getPriceDisplay(priceRange: string) {
  const separatorIndex = priceRange.lastIndexOf('/');

  if (separatorIndex === -1) {
    return { price: priceRange.trim(), packSize: '' };
  }

  return {
    price: priceRange.slice(0, separatorIndex).trim(),
    packSize: priceRange.slice(separatorIndex + 1).trim(),
  };
}

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
  description,
  currentQuantity,
  productHref,
  onOpen,
  onAdd,
}: ProductCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const initialDelayRemainingRef = useRef(FIRST_IMAGE_DELAY_MS);
  const initialDelayCompletedRef = useRef(false);
  const interactionResumeDelayRef = useRef(0);
  const pointerStartXRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickFrameRef = useRef<number | null>(null);
  const lastTransitionStartedAtRef = useRef(-Infinity);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFirstImageReady, setIsFirstImageReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPointerInteracting, setIsPointerInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const galleryImages = useMemo(
    () => (product.images ?? []).filter((image): image is string => Boolean(image)),
    [product.images]
  );
  const galleryKey = galleryImages.join('\u0000');
  const hasGallery = galleryImages.length > 1;
  const hasValidDescription = Boolean(
    product.shortIntro?.trim() || product.description?.trim()
  );
  const displayDescription = hasValidDescription ? description.trim() : '';
  const { price, packSize } = getPriceDisplay(priceRange);
  const sourcingTier = product.variants?.find(
    (variant) => variant.sourcingTier
  )?.sourcingTier;
  const isAvailable = (product.variants ?? []).some(
    (variant) => variant.stockStatus !== 'out_of_stock'
  );

  useEffect(
    () => () => {
      if (suppressClickFrameRef.current !== null) {
        window.cancelAnimationFrame(suppressClickFrameRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !hasGallery) {
      setIsVisible(false);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
    };
  }, [hasGallery, galleryKey]);

  useEffect(() => {
    if (!hasGallery) {
      setPrefersReducedMotion(false);
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => {
      setPrefersReducedMotion(motionQuery.matches);

      if (motionQuery.matches) {
        initialDelayRemainingRef.current = FIRST_IMAGE_DELAY_MS;
        initialDelayCompletedRef.current = false;
        setActiveImageIndex(0);
      }
    };

    updateMotionPreference();
    motionQuery.addEventListener('change', updateMotionPreference);

    return () => motionQuery.removeEventListener('change', updateMotionPreference);
  }, [hasGallery, galleryKey]);

  useEffect(() => {
    setActiveImageIndex(0);
    setIsFirstImageReady(false);
    setIsHovered(false);
    setIsPointerInteracting(false);
    initialDelayRemainingRef.current = FIRST_IMAGE_DELAY_MS;
    initialDelayCompletedRef.current = false;
    interactionResumeDelayRef.current = 0;
    pointerStartXRef.current = null;
    lastTransitionStartedAtRef.current = -Infinity;
  }, [galleryKey]);

  useEffect(() => {
    if (
      !hasGallery ||
      !isVisible ||
      !isFirstImageReady ||
      isHovered ||
      isPointerInteracting ||
      prefersReducedMotion
    ) {
      return;
    }

    const isWaitingOnFirstImage =
      activeImageIndex === 0 && !initialDelayCompletedRef.current;
    const imageDelay = isWaitingOnFirstImage
      ? initialDelayRemainingRef.current
      : LATER_IMAGE_DELAY_MS;
    const delay = Math.max(imageDelay, interactionResumeDelayRef.current);

    interactionResumeDelayRef.current = 0;
    timerStartedAtRef.current = performance.now();

    const timer = window.setTimeout(() => {
      timerStartedAtRef.current = null;
      initialDelayCompletedRef.current = true;
      initialDelayRemainingRef.current = 0;
      lastTransitionStartedAtRef.current = performance.now();
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % galleryImages.length);
    }, delay);

    return () => {
      window.clearTimeout(timer);

      if (isWaitingOnFirstImage && timerStartedAtRef.current !== null) {
        const elapsed = performance.now() - timerStartedAtRef.current;
        initialDelayRemainingRef.current = Math.max(
          0,
          initialDelayRemainingRef.current - elapsed
        );
      }

      timerStartedAtRef.current = null;
    };
  }, [
    activeImageIndex,
    galleryImages.length,
    hasGallery,
    isFirstImageReady,
    isHovered,
    isPointerInteracting,
    isVisible,
    prefersReducedMotion,
  ]);

  const finishPointerInteraction = (
    event: React.PointerEvent<HTMLDivElement>,
    allowSwipe: boolean
  ) => {
    if (!hasGallery || !isSwipePointer(event)) return;

    const startX = pointerStartXRef.current;
    const distance = startX === null ? 0 : event.clientX - startX;
    const didSwipe = allowSwipe && Math.abs(distance) >= SWIPE_THRESHOLD_PX;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerStartXRef.current = null;
    interactionResumeDelayRef.current = LATER_IMAGE_DELAY_MS;
    setIsPointerInteracting(false);

    if (
      didSwipe &&
      performance.now() - lastTransitionStartedAtRef.current >= FADE_DURATION_MS
    ) {
      initialDelayCompletedRef.current = true;
      initialDelayRemainingRef.current = 0;
      suppressClickRef.current = true;
      lastTransitionStartedAtRef.current = performance.now();
      setActiveImageIndex((currentIndex) => {
        const direction = distance < 0 ? 1 : -1;
        return (currentIndex + direction + galleryImages.length) % galleryImages.length;
      });
      suppressClickFrameRef.current = window.requestAnimationFrame(() => {
        suppressClickRef.current = false;
        suppressClickFrameRef.current = null;
      });
    }
  };

  return (
    <article
      ref={cardRef}
      className="group flex h-full cursor-pointer flex-col border border-[#e9e3d5] bg-white p-5 transition-all hover:shadow-lg"
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }

        onOpen();
      }}
      onMouseEnter={
        hasGallery
          ? () => {
              if (isDesktopHoverEnvironment()) {
                setIsHovered(true);
              }
            }
          : undefined
      }
      onMouseLeave={
        hasGallery
          ? () => {
              if (isDesktopHoverEnvironment()) {
                interactionResumeDelayRef.current = LATER_IMAGE_DELAY_MS;
                setIsHovered(false);
              }
            }
          : undefined
      }
    >
      {galleryImages[0] && (
        <div
          className="relative mb-4 aspect-square w-full touch-pan-y overflow-hidden rounded-t-xl bg-[#f4f0e7]"
          data-gallery-image-index={activeImageIndex}
          data-gallery-image-count={galleryImages.length}
          onPointerDown={
            hasGallery
              ? (event) => {
                  if (!isSwipePointer(event)) return;

                  pointerStartXRef.current = event.clientX;
                  setIsPointerInteracting(true);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              : undefined
          }
          onPointerUp={
            hasGallery ? (event) => finishPointerInteraction(event, true) : undefined
          }
          onPointerCancel={
            hasGallery ? (event) => finishPointerInteraction(event, false) : undefined
          }
        >
          {galleryImages.map((image, index) => {
            const isActive = index === activeImageIndex;

            return (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={isActive ? getProductImageAlt(product, index) : ''}
                title={isActive ? getProductImageAlt(product, index) : undefined}
                aria-hidden={!isActive}
                width={800}
                height={800}
                sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1279px) 50vw, 25vw"
                loading="lazy"
                decoding="async"
                onLoad={
                  index === 0
                    ? () => {
                        setIsFirstImageReady(true);
                      }
                    : undefined
                }
                onError={
                  index === 0
                    ? () => {
                        setIsFirstImageReady(true);
                      }
                    : undefined
                }
                className={`pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain ease-out ${
                  prefersReducedMotion
                    ? 'transition-none'
                    : 'transition-opacity duration-[600ms]'
                } ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <span className="mb-3 inline-flex self-start bg-[#f48b4d]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f48b4d]">
          {product.category}
        </span>

        <h3 className="min-h-[3.25rem] font-serif text-xl font-bold leading-[1.3]">
          <a
            href={productHref}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpen();
            }}
            className="line-clamp-2 break-words text-[#183b2b] transition-colors group-hover:text-[#79966e]"
          >
            {product.name}
          </a>
        </h3>

        {displayDescription && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#55705c]">
            {displayDescription}
          </p>
        )}

        <div
          className="mt-auto border-t border-[#e9e3d5] pt-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
            <span className="font-mono text-base font-bold text-[#183b2b]">{price}</span>
            {packSize && (
              <>
                <span className="text-xs text-[#79966e]" aria-hidden="true">·</span>
                <span className="truncate text-xs font-semibold text-[#55705c]">{packSize}</span>
              </>
            )}
          </div>

          {sourcingTier && (
            <span className="mt-3 inline-flex max-w-full items-center gap-1.5 bg-[#79966e]/10 px-2 py-1 text-[11px] font-semibold text-[#3e6927]">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{sourcingTier}</span>
            </span>
          )}

          <div
            className={`mt-3 flex items-center gap-2 text-[11px] font-semibold ${
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
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={!isAvailable}
            className="mt-4 inline-flex min-h-9 w-full items-center justify-center bg-[#183b2b] px-3 py-2 text-xs font-bold text-[#c9dc74] transition-colors hover:bg-[#79966e] disabled:cursor-not-allowed disabled:bg-[#183b2b]/35 disabled:text-[#f4f0e7]"
          >
            + Add 10kg {currentQuantity > 0 ? `(${currentQuantity}kg)` : ''}
          </button>
        </div>
      </div>
    </article>
  );
}
