import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Filter, Leaf, RotateCcw, Search } from 'lucide-react';
import { CataloguePersonalization } from '../personalization/CataloguePersonalization';
import { rankCatalogueProducts } from '../personalization/ranking';
import {
  CataloguePreferences,
  CataloguePreferencesInput,
} from '../personalization/types';
import { ProductCard } from '../products/ProductCard';
import { SeoHead } from '../seo/SeoHead';
import {
  CATEGORY_SEO_CONTENT,
  CategorySeoContent,
  createCategorySchemas,
  createShopSchemas,
  DEFAULT_SOCIAL_IMAGE,
} from '../seo/seo';
import { CatalogProduct, SourcingTier, SOURCING_TIERS } from '../../types';

type SortMode = 'recommended' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

interface CataloguePageProps {
  category?: CategorySeoContent;
  products: CatalogProduct[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  quantities: Record<string, number>;
  preferences: CataloguePreferences | null;
  isAuthenticated: boolean;
  personalizationLoading: boolean;
  personalizationSaving: boolean;
  personalizationError: string | null;
  getPriceRange: (product: CatalogProduct) => string;
  getFarmSource: (product: CatalogProduct) => string;
  getWeeklyStatus: (product: CatalogProduct) => string;
  getDescription: (product: CatalogProduct) => string;
  onSearchChange: (value: string) => void;
  onNavigate: (path: string) => void;
  onAdd: (product: CatalogProduct) => void;
  onRetry: () => void;
  onSignIn: () => void;
  onSavePreferences: (preferences: CataloguePreferencesInput) => Promise<void>;
  onDisablePreferences: () => Promise<void>;
}

interface FilterControlsProps {
  inStockOnly: boolean;
  selectedTiers: SourcingTier[];
  onInStockChange: (checked: boolean) => void;
  onTierToggle: (tier: SourcingTier) => void;
  onReset: () => void;
  showClearAction?: boolean;
}

const SHOP_DESCRIPTION =
  'Explore active, traceable produce from trusted farms, with transparent sourcing and dependable delivery for Bengaluru professional kitchens.';

function getLowestPrice(product: CatalogProduct): number | null {
  const prices = (product.variants || [])
    .map((variant) => variant.sellingPrice ?? variant.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price));

  return prices.length > 0 ? Math.min(...prices) : null;
}

function FilterControls({
  inStockOnly,
  selectedTiers,
  onInStockChange,
  onTierToggle,
  onReset,
  showClearAction = true,
}: FilterControlsProps) {
  const activeFilterCount = Number(inStockOnly) + selectedTiers.length;
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold text-[#183b2b]">
          Filters{hasFilters ? ` (${activeFilterCount})` : ''}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#55705c]">
          Combine availability and sourcing standards.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#79966e]">
          Availability
        </legend>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold text-[#183b2b]">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onInStockChange(event.target.checked)}
            className="h-4 w-4 accent-[#183b2b]"
          />
          In Stock
        </label>
      </fieldset>

      <fieldset className="space-y-2 border-t border-[#183b2b]/15 pt-6">
        <legend className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#79966e]">
          Sourcing standard
        </legend>
        {SOURCING_TIERS.map((tier) => (
          <label
            key={tier}
            className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold text-[#183b2b]"
          >
            <input
              type="checkbox"
              checked={selectedTiers.includes(tier)}
              onChange={() => onTierToggle(tier)}
              className="h-4 w-4 accent-[#183b2b]"
            />
            {tier}
          </label>
        ))}
      </fieldset>

      {showClearAction && hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 py-1 text-xs font-bold text-[#f48b4d] hover:text-[#183b2b]"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="h-full animate-pulse border border-[#e9e3d5] bg-white p-5 motion-reduce:animate-none"
    >
      <div className="aspect-square w-full rounded-t-xl bg-[#e9e3d5]" />
      <div className="mt-4 h-5 w-20 bg-[#f48b4d]/10" />
      <div className="mt-4 h-6 w-4/5 bg-[#e9e3d5]" />
      <div className="mt-2 h-3 w-full bg-[#e9e3d5]/70" />
      <div className="mt-2 h-3 w-3/4 bg-[#e9e3d5]/70" />
      <div className="mt-5 border-t border-[#e9e3d5] pt-4">
        <div className="h-5 w-28 bg-[#e9e3d5]" />
        <div className="mt-3 h-6 w-32 bg-[#79966e]/10" />
        <div className="mt-3 h-3 w-20 bg-[#e9e3d5]" />
        <div className="mt-4 h-10 w-full bg-[#183b2b]/15" />
      </div>
    </article>
  );
}

export function CataloguePage({
  category,
  products,
  isLoading,
  error,
  searchQuery,
  quantities,
  preferences,
  isAuthenticated,
  personalizationLoading,
  personalizationSaving,
  personalizationError,
  getPriceRange,
  getFarmSource,
  getWeeklyStatus,
  getDescription,
  onSearchChange,
  onNavigate,
  onAdd,
  onRetry,
  onSignIn,
  onSavePreferences,
  onDisablePreferences,
}: CataloguePageProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<SourcingTier[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileInStockOnly, setMobileInStockOnly] = useState(false);
  const [mobileSelectedTiers, setMobileSelectedTiers] = useState<SourcingTier[]>([]);
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const mobileFilterPanelRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = Number(inStockOnly) + selectedTiers.length;
  const mobileActiveFilterCount =
    Number(mobileInStockOnly) + mobileSelectedTiers.length;

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    mobileFilterPanelRef.current?.querySelector<HTMLInputElement>('input')?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setMobileInStockOnly(inStockOnly);
      setMobileSelectedTiers(selectedTiers);
      setMobileFiltersOpen(false);
      mobileFilterButtonRef.current?.focus();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileFiltersOpen]);

  const activeProducts = useMemo(
    () =>
      products.filter((product) => {
        const activeState = product.isActive ?? (product as CatalogProduct & { active?: boolean }).active ?? true;
        return activeState !== false && (!category || product.category === category.name);
      }),
    [category, products]
  );

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = activeProducts.filter((product) => {
      const matchesSearch =
        !query ||
        [
          product.name,
          product.category,
          product.description,
          product.shortIntro,
          product.scientificName,
          getFarmSource(product),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStock =
        !inStockOnly ||
        (product.variants || []).some((variant) => variant.stockStatus !== 'out_of_stock');

      const matchesTier =
        selectedTiers.length === 0 ||
        (product.variants || []).some(
          (variant) =>
            Boolean(variant.sourcingTier) &&
            selectedTiers.includes(variant.sourcingTier as SourcingTier)
        );

      return matchesSearch && matchesStock && matchesTier;
    });

    if (sortMode === 'recommended') {
      return rankCatalogueProducts(filtered, preferences);
    }

    return [...filtered].sort((left, right) => {
      if (sortMode === 'name-asc') return left.name.localeCompare(right.name);
      if (sortMode === 'name-desc') return right.name.localeCompare(left.name);

      const leftPrice = getLowestPrice(left);
      const rightPrice = getLowestPrice(right);
      if (leftPrice === null && rightPrice === null) return left.name.localeCompare(right.name);
      if (leftPrice === null) return 1;
      if (rightPrice === null) return -1;
      return sortMode === 'price-asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
    });
  }, [
    activeProducts,
    getFarmSource,
    inStockOnly,
    preferences,
    searchQuery,
    selectedTiers,
    sortMode,
  ]);

  const schemas = useMemo(
    () =>
      category
        ? createCategorySchemas(category, activeProducts)
        : createShopSchemas(activeProducts),
    [activeProducts, category]
  );
  const socialImage =
    activeProducts.find((product) => product.images?.[0])?.images[0] || DEFAULT_SOCIAL_IMAGE;
  const canonicalPath = category ? `/${category.slug}` : '/shop';
  const pageTitle = category ? category.title : 'Produce Catalogue';
  const pageDescription = category ? category.description : SHOP_DESCRIPTION;

  const toggleTier = (tier: SourcingTier) => {
    setSelectedTiers((current) =>
      current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier]
    );
  };

  const clearFilters = () => {
    setInStockOnly(false);
    setSelectedTiers([]);
    setMobileInStockOnly(false);
    setMobileSelectedTiers([]);
  };

  const toggleMobileTier = (tier: SourcingTier) => {
    setMobileSelectedTiers((current) =>
      current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier]
    );
  };

  const openMobileFilters = () => {
    setMobileInStockOnly(inStockOnly);
    setMobileSelectedTiers(selectedTiers);
    setMobileFiltersOpen(true);
  };

  const closeMobileFilters = () => {
    setMobileInStockOnly(inStockOnly);
    setMobileSelectedTiers(selectedTiers);
    setMobileFiltersOpen(false);
    mobileFilterButtonRef.current?.focus();
  };

  const applyMobileFilters = () => {
    setInStockOnly(mobileInStockOnly);
    setSelectedTiers(mobileSelectedTiers);
    setMobileFiltersOpen(false);
    mobileFilterButtonRef.current?.focus();
  };

  const navigate = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <main className="catalogue-page w-full flex-1 bg-[#f4f0e7] text-[#183b2b]">
      <SeoHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath={canonicalPath}
        image={socialImage}
        schemas={schemas}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <nav
          aria-label="Catalogue categories"
          className="flex gap-2 overflow-x-auto border-b border-[#183b2b]/15 pb-4"
        >
          <a
            href="/shop"
            onClick={(event) => navigate(event, '/shop')}
            aria-current={!category ? 'page' : undefined}
            className={`whitespace-nowrap px-4 py-2 text-xs font-bold transition-colors ${
              !category
                ? 'bg-[#183b2b] text-[#c9dc74]'
                : 'border border-[#183b2b]/15 bg-white text-[#183b2b] hover:border-[#183b2b]'
            }`}
          >
            Shop All
          </a>
          {Object.values(CATEGORY_SEO_CONTENT).map((item) => {
            const isActive = category?.slug === item.slug;
            return (
              <a
                key={item.slug}
                href={`/${item.slug}`}
                onClick={(event) => navigate(event, `/${item.slug}`)}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap px-4 py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-[#183b2b] text-[#c9dc74]'
                    : 'border border-[#183b2b]/15 bg-white text-[#183b2b] hover:border-[#183b2b]'
                }`}
              >
                {item.name}
              </a>
            );
          })}
        </nav>

        <header
          className={`grid gap-5 border-b border-[#183b2b]/15 lg:grid-cols-[1.15fr_0.85fr] lg:items-end ${
            category ? 'py-6 sm:py-7' : 'py-9'
          }`}
        >
          <div>
            <p className="eyebrow mb-3">
              {category ? 'Farm-fresh category' : 'Complete produce catalogue'}
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl">
              {category?.name || 'Produce Catalogue'}
            </h1>
            <p className="mt-3 text-xs font-mono font-bold tracking-[0.12em] text-[#f48b4d]">
              {activeProducts.length} {activeProducts.length === 1 ? 'Product' : 'Products'}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#55705c]">
            {category?.introduction || SHOP_DESCRIPTION}
          </p>
        </header>

        {!category && (
          <div className="pt-8">
            <CataloguePersonalization
              preferences={preferences}
              isAuthenticated={isAuthenticated}
              isLoading={personalizationLoading}
              isSaving={personalizationSaving}
              error={personalizationError}
              onSignIn={onSignIn}
              onSave={onSavePreferences}
              onDisable={onDisablePreferences}
            />
          </div>
        )}

        <section
          className={category ? 'py-5 sm:py-6' : 'py-8'}
          aria-labelledby="catalogue-products-heading"
        >
          {category && (
            <h2 id="catalogue-products-heading" className="sr-only">
              {category.name} products
            </h2>
          )}
          <div
            className={`grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
              category ? 'mb-4' : 'mb-6'
            }`}
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#79966e]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={
                  category
                    ? `Search within ${category.name.toLowerCase()}`
                    : 'Search produce, categories or farms'
                }
                aria-label={
                  category
                    ? `Search within ${category.name}`
                    : 'Search all produce'
                }
                className={`w-full border border-[#183b2b]/20 bg-white pl-10 pr-4 text-sm text-[#183b2b] outline-none transition-colors placeholder:text-[#79966e] focus:border-[#183b2b] ${
                  category ? 'h-11' : 'min-h-11 py-3'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex">
              <button
                ref={mobileFilterButtonRef}
                type="button"
                onClick={mobileFiltersOpen ? closeMobileFilters : openMobileFilters}
                aria-expanded={mobileFiltersOpen}
                aria-controls="mobile-catalogue-filters"
                aria-label={
                  activeFilterCount > 0
                    ? `Filters, ${activeFilterCount} active`
                    : 'Filters'
                }
                className={`inline-flex items-center justify-center gap-2 border border-[#183b2b]/20 bg-white px-4 text-xs font-bold text-[#183b2b] md:hidden ${
                  category ? 'h-11' : 'min-h-11'
                }`}
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>

              <label
                className={`flex items-center gap-2 border border-[#183b2b]/20 bg-white px-3 text-xs font-bold ${
                  category ? 'h-11 md:w-52' : 'min-h-11'
                }`}
              >
                <span className="sr-only">Sort products</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  aria-label="Sort products"
                  className="w-full bg-transparent text-[#183b2b] outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="price-asc">Price Low → High</option>
                  <option value="price-desc">Price High → Low</option>
                </select>
              </label>
            </div>
          </div>

          {mobileFiltersOpen && (
            <div
              ref={mobileFilterPanelRef}
              id="mobile-catalogue-filters"
              role="region"
              aria-label="Product filters"
              className="mb-6 max-h-[calc(100dvh-8rem)] overflow-y-auto border border-[#183b2b]/15 bg-white p-5 md:hidden"
            >
              <FilterControls
                inStockOnly={mobileInStockOnly}
                selectedTiers={mobileSelectedTiers}
                onInStockChange={setMobileInStockOnly}
                onTierToggle={toggleMobileTier}
                onReset={() => {
                  setMobileInStockOnly(false);
                  setMobileSelectedTiers([]);
                }}
                showClearAction={false}
              />

              <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-[#183b2b]/15 bg-white pt-4">
                {mobileActiveFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileInStockOnly(false);
                      setMobileSelectedTiers([]);
                    }}
                    className="px-1 py-2 text-xs font-bold text-[#f48b4d] hover:text-[#183b2b]"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={applyMobileFilters}
                  className="ml-auto min-h-10 bg-[#183b2b] px-5 text-xs font-bold text-[#c9dc74]"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          <div
            className={
              category
                ? 'grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]'
                : 'grid gap-7 md:grid-cols-[220px_minmax(0,1fr)]'
            }
          >
            <aside
              aria-label="Product filters"
              className={`hidden self-start border border-[#183b2b]/15 bg-white md:sticky md:top-6 md:block ${
                category ? 'category-filter-sidebar p-4' : 'p-5'
              }`}
            >
              <FilterControls
                inStockOnly={inStockOnly}
                selectedTiers={selectedTiers}
                onInStockChange={setInStockOnly}
                onTierToggle={toggleTier}
                onReset={clearFilters}
              />
            </aside>

            <div>
              {!category && (
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 id="catalogue-products-heading" className="font-serif text-2xl font-bold">
                    All Produce
                  </h2>
                  {!isLoading && (
                    <span className="text-xs font-mono text-[#55705c]">
                      {visibleProducts.length} shown
                    </span>
                  )}
                </div>
              )}

              {isLoading ? (
                <div role="status" aria-live="polite">
                  <span className="sr-only">Loading products…</span>
                  <div
                    className={
                      category
                        ? 'category-product-grid grid gap-5'
                        : 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'
                    }
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <ProductCardSkeleton key={index} />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="border border-red-200 bg-red-50 p-8 text-center text-red-900">
                  <p className="text-sm font-bold">Unable to load the produce catalogue.</p>
                  <p className="mt-2 text-xs font-mono">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 min-h-11 bg-[#183b2b] px-5 text-xs font-bold text-[#c9dc74]"
                  >
                    Retry loading catalogue
                  </button>
                </div>
              ) : activeProducts.length === 0 ? (
                <div className="border border-[#183b2b]/15 bg-white p-10 text-center">
                  <Leaf className="mx-auto h-8 w-8 text-[#79966e]" aria-hidden="true" />
                  <h2 className="mt-3 font-serif text-2xl font-bold">
                    No products are currently available in this category.
                  </h2>
                  <a
                    href="/shop"
                    onClick={(event) => navigate(event, '/shop')}
                    className="mt-6 inline-flex min-h-11 items-center bg-[#183b2b] px-5 text-xs font-bold text-[#c9dc74]"
                  >
                    Return to shop
                  </a>
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="border border-[#183b2b]/15 bg-white p-10 text-center">
                  <Leaf className="mx-auto h-8 w-8 text-[#79966e]" aria-hidden="true" />
                  <h2 className="mt-3 font-serif text-2xl font-bold">
                    {activeFilterCount > 0
                      ? 'No products match these filters.'
                      : 'No products match your selection.'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-[#55705c]">
                    {activeFilterCount > 0
                      ? 'Clear the active filters to view more produce.'
                      : 'Clear the search to view the complete available range.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFilterCount > 0) {
                        clearFilters();
                      } else {
                        onSearchChange('');
                      }
                    }}
                    className={
                      activeFilterCount > 0
                        ? 'mt-4 px-1 py-2 text-xs font-bold text-[#f48b4d] hover:text-[#183b2b]'
                        : 'mt-6 min-h-11 bg-[#183b2b] px-5 text-xs font-bold text-[#c9dc74]'
                    }
                  >
                    {activeFilterCount > 0 ? 'Clear filters' : 'Clear search'}
                  </button>
                </div>
              ) : (
                <div
                  className={
                    category
                      ? 'category-product-grid grid gap-5'
                      : 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'
                  }
                >
                  {visibleProducts.map((product) => {
                    const productHref = `/produce/${encodeURIComponent(product.slug)}`;
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        productHref={productHref}
                        priceRange={getPriceRange(product)}
                        farmSource={getFarmSource(product)}
                        weeklyStatus={getWeeklyStatus(product)}
                        description={getDescription(product)}
                        currentQuantity={quantities[product.id] || 0}
                        onOpen={() => onNavigate(productHref)}
                        onAdd={() => onAdd(product)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
