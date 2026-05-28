import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowUpDown, X, Loader } from 'lucide-react';
import { Product } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function ProductManager({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onShowNotification
}: ProductManagerProps) {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Table sorting states
  const [sortField, setSortField] = useState<keyof Product>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Add/Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Deletion tracking state
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Form states and field validations
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    taxPercent: '18',
    category: '',
    inStock: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-focus ref for dialogs
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Effect to handle auto-focusing the first interactive text field in the modal
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 80);
    }
  }, [isModalOpen]);

  // Prepopulate categories from current set
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return ['All', ...Array.from(list)];
  }, [products]);

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      price: '',
      taxPercent: '18',
      category: '',
      inStock: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      price: product.price.toString(),
      taxPercent: product.taxPercent.toString(),
      category: product.category,
      inStock: product.inStock !== undefined ? product.inStock.toString() : ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Safe Deletion prompt trigger
  const handleDeletePrompt = (productId: string) => {
    setProductToDelete(productId);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete);
      onShowNotification('Product successfully removed', 'success');
      setProductToDelete(null);
    }
  };

  // Sort toggle logic
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Field validation and save logic
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      errors.sku = 'SKU Identifier is required.';
    } else {
      // Check for SKU duplicates (excluding currently edited product)
      const duplicateSKU = products.some(
        (p) =>
          p.sku.toLowerCase() === formData.sku.trim().toLowerCase() &&
          (!editingProduct || p.id !== editingProduct.id)
      );
      if (duplicateSKU) {
        errors.sku = 'SKU is already assigned to another product.';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }

    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.price = 'Price must be a positive currency amount.';
    }

    const parsedTax = parseFloat(formData.taxPercent);
    if (isNaN(parsedTax) || parsedTax < 0) {
      errors.taxPercent = 'Tax percentage cannot be negative.';
    }

    if (!formData.category.trim()) {
      errors.category = 'Item Category classification is required.';
    }

    const stockVal = formData.inStock.trim();
    if (stockVal !== '') {
      const parsedStock = parseInt(stockVal, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        errors.inStock = 'Available stock must be zero or a positive integer.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      onShowNotification('Please resolve incorrect invoice fields.', 'error');
      return;
    }

    // Process valid entry
    const finalProduct = {
      sku: formData.sku.trim().toUpperCase(),
      name: formData.name.trim(),
      price: parsedPrice,
      taxPercent: parsedTax,
      category: formData.category.trim(),
      inStock: stockVal !== '' ? parseInt(stockVal, 10) : undefined
    };

    if (editingProduct) {
      onEditProduct({ id: editingProduct.id, ...finalProduct });
      onShowNotification(`Product "${finalProduct.name}" updated successfully`, 'success');
    } else {
      onAddProduct(finalProduct);
      onShowNotification(`Product "${finalProduct.name}" added to catalog`, 'success');
    }

    setIsModalOpen(false);
  };

  // Filter & Search computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Sort calculation
  const sortedAndFiltered = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Safe undefined checks for stocks
      if (aVal === undefined) aVal = -1;
      if (bVal === undefined) bVal = -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredProducts, sortField, sortDirection]);

  // Pagination bounds
  const totalPages = Math.ceil(sortedAndFiltered.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFiltered.slice(start, start + itemsPerPage);
  }, [sortedAndFiltered, currentPage]);

  const shopNameRef = useRef<string>('');

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-800">
            Products Database
          </h1>
          <p className="text-sm font-sans text-slate-500 mt-1">
            Build and update inventory catalogs, SKU pricing models, and GST tax codes.
          </p>
        </div>
        <button
          id="btn-add-product"
          onClick={handleOpenAddModal}
          className="bg-crimson hover:bg-red-800 text-white flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg shadow-sm font-semibold text-xs tracking-wider uppercase transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Catalog Search Filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-soft">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            id="product-search-input"
            type="text"
            placeholder="Search catalog by SKU, name, or category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-crimson focus:bg-white focus:outline-none rounded-lg text-sm text-slate-700 transition-all placeholder:text-slate-400"
          />
        </div>
        <div>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-crimson focus:outline-none rounded-lg text-sm text-slate-700 transition-all cursor-pointer font-medium"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Core Database Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th
                  onClick={() => handleSort('sku')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    SKU Code
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Product Description
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Category
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Price (₹)
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('taxPercent')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    GST Tax %
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('inStock')}
                  className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  <div className="flex items-center gap-1.5">
                    Stock Availability
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-sm">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {p.sku}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="bg-slate-100/90 text-slate-600 px-2 py-1 rounded-md font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      ₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {p.taxPercent}% Tax
                    </td>
                    <td className="px-6 py-4">
                      {p.inStock !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.inStock > 20
                              ? 'bg-emerald-50 text-emerald-700'
                              : p.inStock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-crimson'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.inStock > 20
                                ? 'bg-emerald-500'
                                : p.inStock > 0
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {p.inStock} items
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not Tracked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`p-edit-${p.id}`}
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-crimson hover:bg-rose-50 rounded-md transition-all"
                          title="Modify Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          id={`p-delete-${p.id}`}
                          onClick={() => handleDeletePrompt(p.id)}
                          className="p-1.5 text-slate-500 hover:text-crimson hover:bg-rose-50 rounded-md transition-all"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-sans">
                    No products match your current filters. Click "Add New Product" to populate items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-sans text-slate-500 bg-slate-50/40">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, sortedAndFiltered.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{sortedAndFiltered.length}</span>{' '}
              products
            </div>
            <div className="flex items-center gap-1">
              <button
                id="pagination-prev"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-md hover:bg-slate-50 active:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  id={`pagination-page-${pNum}`}
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                    currentPage === pNum
                      ? 'bg-crimson text-white border border-crimson'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pNum}
                </button>
              ))}
              <button
                id="pagination-next"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 bg-white rounded-md hover:bg-slate-50 active:bg-slate-100 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured Deletion Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={productToDelete !== null}
        title="Confirm SKU Removal"
        message="Are you certain you want to remove this product from your database? This action is permanent and cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
        confirmText="Remove SKU"
        cancelText="Keep SKU"
      />

      {/* Styled Entry Modal for Adding & Editing Products */}
      {isModalOpen && (
        <div
          id="product-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        >
          <div
            id="product-modal-container"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-slide-in"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="bg-cream border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-crimson">
                {editingProduct ? 'Update SKU Specification' : 'Add Product to Inventory'}
              </h3>
              <button
                id="product-modal-close"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors p-1 hover:bg-red-55 rounded-full"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-sm font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  SKU Identifiers (Stock Keeping Unit)*
                </label>
                <input
                  id="form-sku"
                  ref={firstInputRef}
                  type="text"
                  placeholder="e.g. LED-005W, SM-SW-01"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all uppercase placeholder:text-slate-400 ${
                    formErrors.sku
                      ? 'border-rose-450 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                  }`}
                />
                {formErrors.sku && (
                  <p className="text-crimson text-xs font-medium mt-1">{formErrors.sku}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Product Description Name*
                </label>
                <input
                  id="form-name"
                  type="text"
                  placeholder="e.g. Wire Roll (50m) Copper"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 ${
                    formErrors.name
                      ? 'border-rose-450 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-crimson text-xs font-medium mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Unit Price (₹ INR)*
                  </label>
                  <input
                    id="form-price"
                    type="number"
                    step="0.01"
                    placeholder="150"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 ${
                      formErrors.price
                        ? 'border-rose-450 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="text-crimson text-xs font-medium mt-1">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    GST Tax Rate (%)*
                  </label>
                  <select
                    id="form-tax"
                    value={formData.taxPercent}
                    onChange={(e) => setFormData({ ...formData, taxPercent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-crimson focus:outline-none rounded-md transition-all font-medium text-slate-700 bg-white"
                  >
                    <option value="0">0% Exempt</option>
                    <option value="5">5% SGST + CGST</option>
                    <option value="12">12% Standard Engineering</option>
                    <option value="18">18% High-Grade Engineering</option>
                    <option value="28">28% Luxury Items</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Category Classification*
                  </label>
                  <input
                    id="form-category"
                    type="text"
                    placeholder="e.g. Cables, Lighting"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 ${
                      formErrors.category
                        ? 'border-rose-450 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                    }`}
                  />
                  {formErrors.category && (
                    <p className="text-crimson text-xs font-medium mt-1">{formErrors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Current Stock (Optional)
                  </label>
                  <input
                    id="form-stock"
                    type="number"
                    placeholder="e.g. 100"
                    value={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 ${
                      formErrors.inStock
                        ? 'border-rose-450 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                    }`}
                  />
                  {formErrors.inStock && (
                    <p className="text-crimson text-xs font-medium mt-1">{formErrors.inStock}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  id="form-cancel-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-md transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  id="form-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-crimson hover:bg-red-800 text-white text-xs font-semibold rounded-md transition-all uppercase tracking-wider shadow-sm"
                >
                  {editingProduct ? 'Apply Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
