import React, { useMemo } from 'react';
import { ArrowLeft, Leaf, Loader2 } from 'lucide-react';
import { CatalogProduct } from '../../types';
import { ProductCard } from '../products/ProductCard';
import { SeoHead } from './SeoHead';
import {
  CategorySeoContent,
  createCategorySchemas,
  getCategorySeoByName,
  SITE_URL,
} from './seo';

interface CategoryPageProps {
  category: CategorySeoContent;
  products: CatalogProduct[];
  isLoading: boolean;
  quantities: Record<string, number>;
  getPriceRange: (product: CatalogProduct) => string;
  getFarmSource: (product: CatalogProduct) => string;
  getWeeklyStatus: (product: CatalogProduct) => string;
  getDescription: (product: CatalogProduct) => string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onAdd: (product: CatalogProduct) => void;
}

export function CategoryPage({
  category,
  products,
  isLoading,
  quantities,
  getPriceRange,
  getFarmSource,
  getWeeklyStatus,
  getDescription,
  onBack,
  onNavigate,
  onAdd,
}: CategoryPageProps) {
  const schemas = useMemo(
    () => createCategorySchemas(category, products),
    [category, products]
  );
  const socialImage = products.find((product) => product.images?.[0])?.images[0];

  return (
    <div className="min-h-screen bg-[#f4f0e7] text-[#183b2b]">
      <SeoHead
        title={category.title}
        description={category.description}
        canonicalPath={`/produce/category/${category.slug}`}
        image={socialImage}
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
          <a href={SITE_URL} className="font-serif text-lg font-bold tracking-wide">
            THE SOIL THEORY
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-[11px] font-mono text-[#55705c]">
          <button type="button" onClick={onBack} className="hover:text-[#183b2b] hover:underline">
            Produce Catalogue
          </button>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{category.name}</span>
        </nav>

        <header className="mt-6 grid gap-6 border-b border-[#183b2b]/15 pb-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#f48b4d]">
              Bengaluru professional produce
            </p>
            <h1 className="mt-2 max-w-4xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
              {category.title}
            </h1>
          </div>
          <p className="text-sm leading-7 text-[#55705c]">{category.introduction}</p>
        </header>

        <section className="py-8" aria-labelledby="category-products-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#79966e]">
                Current catalogue
              </p>
              <h2 id="category-products-heading" className="mt-1 font-serif text-3xl font-bold">
                {category.name}
              </h2>
            </div>
            {!isLoading && (
              <span className="text-xs font-mono text-[#55705c]">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="border border-[#183b2b]/15 bg-white p-10 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#79966e]" />
              <p className="mt-3 text-xs font-mono">Loading seasonal availability…</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const href = `/produce/${encodeURIComponent(product.slug)}`;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    productHref={href}
                    priceRange={getPriceRange(product)}
                    farmSource={getFarmSource(product)}
                    weeklyStatus={getWeeklyStatus(product)}
                    description={getDescription(product)}
                    currentQuantity={quantities[product.id] || 0}
                    onOpen={() => onNavigate(href)}
                    onAdd={() => onAdd(product)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="border border-[#183b2b]/15 bg-white p-10 text-center">
              <Leaf className="mx-auto h-8 w-8 text-[#79966e]" />
              <h2 className="mt-3 font-serif text-2xl font-bold">Seasonal availability is being updated</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[#55705c]">
                This category remains part of our sourcing network. Contact us for the latest farm
                availability and planned harvest dates.
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-6 border-y border-[#183b2b]/15 py-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f48b4d]">
              Sourcing knowledge
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold">
              Choosing {category.name.toLowerCase()} for professional kitchens
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#55705c]">{category.education}</p>
          </div>

          <aside aria-labelledby="related-categories-heading">
            <h2 id="related-categories-heading" className="text-xs font-mono font-bold uppercase tracking-wider">
              Related categories
            </h2>
            <div className="mt-3 grid gap-2">
              {category.relatedCategories.map((relatedCategory) => {
                const related = getCategorySeoByName(relatedCategory);
                const href = `/produce/category/${related.slug}`;
                return (
                  <a
                    key={related.slug}
                    href={href}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(href);
                    }}
                    className="flex min-h-11 items-center justify-between border border-[#183b2b]/15 bg-white px-4 py-3 text-sm font-bold transition-colors hover:border-[#183b2b]"
                  >
                    {related.name}
                    <span aria-hidden="true">→</span>
                  </a>
                );
              })}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
