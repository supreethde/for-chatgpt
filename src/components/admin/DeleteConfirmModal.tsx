import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { CatalogProduct } from '../../types';

interface DeleteConfirmModalProps {
  product: CatalogProduct | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  product,
  onConfirm,
  onCancel,
}) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-serif font-bold text-stone-900 text-lg">Confirm Delete</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Are you sure you want to delete <strong className="text-stone-900 font-semibold">{product.name}</strong>? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Product
          </button>
        </div>
      </div>
    </div>
  );
};
