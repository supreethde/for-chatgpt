import React, { useState } from 'react';
import { CatalogProduct, ProductCategory, SourcingTier } from '../../types';
import { Plus, Edit2, Trash2, Search, Filter, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ProductListProps {
  products: CatalogProduct[];
  onAddProduct: () => void;
  onEditProduct: (product: CatalogProduct) => void;
  onDeleteProduct: (product: CatalogProduct) => void;
  onToggleActive: (productId: string) => void;
}

const CATEGORIES: (ProductCategory | 'All')[] = [
  'All',
  'Vegetables',
  'Fruits',
  'Leafy Greens',
  'Microgreens',
  'Exotics',
  'Mushrooms',
];

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleActive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');

  // Filter and Sort logic
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.scientificName && product.scientificName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.regionalNameKannada && product.regionalNameKannada.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.regionalNameHindi && product.regionalNameHindi.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 100;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 100;
      return orderA - orderB;
    });

  // Calculate lowest price for a product across all variants
  const getLowestPrice = (product: CatalogProduct): number => {
    if (!product.variants || product.variants.length === 0) return 0;
    return Math.min(...product.variants.map((v) => v.sellingPrice ?? v.price ?? 0));
  };

  // Extract distinct sourcing tiers for a product
  const getDistinctSourcingTiers = (product: CatalogProduct): SourcingTier[] => {
    if (!product.variants) return [];
    const tiers = product.variants
      .map((v) => v.sourcingTier)
      .filter((t): t is SourcingTier => Boolean(t));
    return Array.from(new Set(tiers));
  };

  // Check overall stock status
  const getStockBadge = (product: CatalogProduct) => {
    if (!product.variants || product.variants.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
          No Variants
        </span>
      );
    }

    const hasInStock = product.variants.some((v) => v.stockStatus === 'in_stock');
    const hasLowStock = product.variants.some((v) => v.stockStatus === 'low_stock');

    if (hasInStock) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> In Stock
        </span>
      );
    }

    if (hasLowStock) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" /> Low Stock
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-600" /> Out of Stock
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, slug or regional name..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-stone-50/50"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400 shrink-0 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white font-medium text-stone-700"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          type="button"
          onClick={onAddProduct}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          id="admin-add-product-btn"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Product List Table / Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800">No products found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== 'All'
                ? 'Try adjusting your search query or filter to find products.'
                : 'Get started by adding your first product to the catalogue.'}
            </p>
            {searchTerm || selectedCategory !== 'All' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
              >
                Clear search & filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-mono font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Order</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Lowest Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredProducts.map((product) => {
                  const lowestPrice = getLowestPrice(product);
                  const primaryImg = product.images?.[0];

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-stone-50/70 transition-colors group"
                    >
                      {/* Order */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-stone-500 text-xs">
                        #{product.displayOrder ?? 100}
                      </td>

                      {/* Product Thumbnail & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-stone-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 group-hover:text-emerald-900 transition-colors">
                              {product.name}
                            </p>
                            {product.scientificName && (
                              <p className="text-[11px] text-emerald-800 italic font-serif">
                                {product.scientificName}
                              </p>
                            )}
                            <p className="text-[11px] text-stone-400 font-mono">
                              /{product.slug}
                            </p>
                            {(product.regionalNameKannada || product.regionalNameHindi) && (
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                {[product.regionalNameKannada, product.regionalNameHindi]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            )}

                            {/* Distinct Sourcing Tier Badges */}
                            {(() => {
                              const tiers = getDistinctSourcingTiers(product);
                              if (tiers.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tiers.map((tier) => (
                                    <span
                                      key={tier}
                                      className={`inline-block px-1.5 py-0.5 text-[10px] rounded border font-semibold ${
                                        tier === 'Certified Organic'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : tier === 'Organically Grown'
                                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                                          : 'bg-sky-50 text-sky-800 border-sky-200'
                                      }`}
                                    >
                                      {tier}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 text-[11px] font-medium bg-stone-100 text-stone-700 rounded-md border border-stone-200/80">
                          {product.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                        ₹{lowestPrice}
                        {product.variants.length > 1 && (
                          <span className="text-[10px] text-stone-400 font-normal ml-1">
                            ({product.variants.length} packs)
                          </span>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="py-3 px-4">{getStockBadge(product)}</td>

                      {/* Active Status Toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleActive(product.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            product.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                          }`}
                          title="Click to toggle active status"
                        >
                          {product.isActive ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-700" /> Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-stone-400" /> Inactive
                            </>
                          )}
                        </button>
                      </td>

                      {/* Edit / Delete Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-emerald-800 bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product)}
                            className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
