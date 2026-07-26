import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, ArrowLeft, Package, Loader2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { CatalogProduct } from '../types';
import { ProductList } from '../components/admin/ProductList';
import { ProductForm } from '../components/admin/ProductForm';
import { DeleteConfirmModal } from '../components/admin/DeleteConfirmModal';
import {
  fetchProductsFromFirestore,
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  toggleProductActiveInFirestore,
} from '../services/productService';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

interface AdminDashboardProps {
  user?: User | null;
  authLoading?: boolean;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user: propUser,
  authLoading = false,
  onNavigate,
  onLogout,
}) => {
  const currentUser = propUser || auth.currentUser;

  // State
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // UI View state: 'list' | 'add' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<CatalogProduct | null>(null);

  // Load products from Firestore
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchProductsFromFirestore();
      setProducts(fetched);
    } catch (err: any) {
      console.error('Failed to fetch products from Firestore:', err);
      let msg = 'Failed to load products from Firestore. Please verify permissions or network connection.';
      if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = parsed.error;
        } catch {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProducts();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading && !currentUser && onNavigate) {
      onNavigate('/admin/login');
    }
  }, [currentUser, authLoading, onNavigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-600 font-medium">Verifying admin authorization...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (onLogout) {
        onLogout();
      }
      if (onNavigate) {
        onNavigate('/admin/login');
      }
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // CRUD Actions
  const handleSaveProduct = async (product: CatalogProduct) => {
    setActionError(null);
    setSubmitting(true);
    try {
      if (viewMode === 'edit') {
        await updateProductInFirestore(product, editingProduct?.slug);
      } else {
        await addProductToFirestore(product);
      }
      await loadProducts();
      setViewMode('list');
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Save product error:', err);
      let msg = 'Failed to save product to Firestore.';
      if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = parsed.error;
        } catch {
          msg = err.message;
        }
      }
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await deleteProductFromFirestore(deletingProduct.slug);
      setDeletingProduct(null);
      await loadProducts();
    } catch (err: any) {
      console.error('Delete product error:', err);
      let msg = 'Failed to delete product from Firestore.';
      if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = parsed.error;
        } catch {
          msg = err.message;
        }
      }
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (productId: string) => {
    const target = products.find((p) => p.id === productId || p.slug === productId);
    if (!target) return;
    
    const newStatus = !target.isActive;
    setActionError(null);
    
    // Optimistic update
    setProducts(
      products.map((p) => (p.slug === target.slug ? { ...p, isActive: newStatus } : p))
    );

    try {
      await toggleProductActiveInFirestore(target.slug, newStatus);
    } catch (err: any) {
      console.error('Toggle active error:', err);
      // Rollback
      setProducts(
        products.map((p) => (p.slug === target.slug ? { ...p, isActive: target.isActive } : p))
      );
      let msg = 'Failed to update product active status in Firestore.';
      if (err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = parsed.error;
        } catch {
          msg = err.message;
        }
      }
      setActionError(msg);
    }
  };

  // Optional helper to seed initial products if Firestore is empty
  const handleSeedInitialProducts = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      for (const prod of INITIAL_PRODUCTS) {
        await addProductToFirestore(prod);
      }
      await loadProducts();
    } catch (err: any) {
      console.error('Seed error:', err);
      setActionError('Failed to seed products: ' + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-6 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/');
              } else {
                window.location.href = '/';
              }
            }}
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Return to Main Store"
            id="admin-dashboard-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="font-serif font-bold text-stone-900 text-lg block leading-none">
              The Soil Theory
            </span>
            <span className="text-[10px] font-mono text-emerald-800 font-semibold tracking-wider uppercase">
              Partner & Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-600 font-mono bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 hidden sm:inline-block">
            {currentUser.email || 'Admin User'}
          </span>
          <button
            type="button"
            id="admin-sign-out-btn"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-red-700 bg-stone-100 hover:bg-red-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Admin Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Section Title Banner */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-800" />
              <h1 className="text-xl font-serif font-bold text-stone-900">
                Product Management Catalogue
              </h1>
            </div>
            <p className="text-xs text-stone-500 max-w-2xl">
              Create, edit, and organize products directly in Cloud Firestore (collection: <code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">products</code>).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-stone-500 font-medium">Total Products: </span>
              <strong className="text-emerald-900 font-bold font-mono">{products.length}</strong>
            </div>
            <div className="bg-stone-100 border border-stone-200 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-stone-500 font-medium">Active: </span>
              <strong className="text-stone-900 font-bold font-mono">{activeCount}</strong>
            </div>
          </div>
        </div>

        {/* Global Action Banner Error */}
        {actionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="font-medium">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-stone-500 hover:text-stone-800 text-[11px] font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl border border-stone-200 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-emerald-800 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-900">Connecting to Cloud Firestore...</h3>
              <p className="text-xs text-stone-500">Fetching catalogue items from collection <code className="font-mono">products</code></p>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white p-12 rounded-2xl border border-red-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-stone-900">Failed to Load Products</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Fetching
            </button>
          </div>
        ) : (
          /* Loaded View Modes */
          <>
            {/* Empty Firestore State Banner with Option to Seed */}
            {products.length === 0 && viewMode === 'list' && (
              <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-amber-900">Firestore collection "products" is currently empty</h3>
                  <p className="text-xs text-amber-800 max-w-xl">
                    You can start adding products manually using the button below, or quickly seed sample products into Firestore.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSeedInitialProducts}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Seed Sample Products to Firestore
                </button>
              </div>
            )}

            {viewMode === 'list' && (
              <ProductList
                products={products}
                onAddProduct={() => {
                  setActionError(null);
                  setEditingProduct(null);
                  setViewMode('add');
                }}
                onEditProduct={(prod) => {
                  setActionError(null);
                  setEditingProduct(prod);
                  setViewMode('edit');
                }}
                onDeleteProduct={(prod) => {
                  setActionError(null);
                  setDeletingProduct(prod);
                }}
                onToggleActive={handleToggleActive}
              />
            )}

            {(viewMode === 'add' || viewMode === 'edit') && (
              <ProductForm
                product={editingProduct}
                onSave={handleSaveProduct}
                onCancel={() => {
                  setActionError(null);
                  setViewMode('list');
                  setEditingProduct(null);
                }}
              />
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          product={deletingProduct}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      </main>
    </div>
  );
};


