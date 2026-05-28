import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, RotateCcw, AlertCircle, ShoppingCart, UserCheck, CreditCard } from 'lucide-react';
import { Product, Customer, InvoiceItem, Invoice } from '../types';

interface InvoiceBuilderProps {
  products: Product[];
  nextInvoiceNumber: string;
  onProceedToCheckout: (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'time' | 'status'>) => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function InvoiceBuilder({
  products,
  nextInvoiceNumber,
  onProceedToCheckout,
  onShowNotification
}: InvoiceBuilderProps) {
  // Customer Details states
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    gst: '',
    address: ''
  });
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});

  // Line items state
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  
  // Last deleted item for immediate undo
  const [lastRemovedItem, setLastRemovedItem] = useState<{
    item: InvoiceItem;
    index: number;
  } | null>(null);

  // Auto-complete variables
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Discount options
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Close product autocomplete on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for dropdown lookup
  const filteredSearchProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    return products.filter((p) => {
      const query = productSearch.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [products, productSearch]);

  // Append product to active line items
  const handleAddProduct = (product: Product) => {
    // Check if product is already added as a line item
    const existingIndex = lineItems.findIndex((item) => item.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...lineItems];
      const item = updated[existingIndex];
      // Increment quantity
      const newQty = item.qty + 1;
      
      // Stock warning logic
      if (product.inStock !== undefined && newQty > product.inStock) {
        onShowNotification(`Warning: Requested stock exceeds current availability (${product.inStock} left)`, 'error');
      }

      const rawSub = newQty * item.unitPrice;
      const calculatedTax = rawSub * (product.taxPercent / 100);
      
      updated[existingIndex] = {
        ...item,
        qty: newQty,
        tax: Number(calculatedTax.toFixed(2)),
        amount: Number((rawSub + calculatedTax).toFixed(2))
      };
      setLineItems(updated);
      onShowNotification(`Increased quantity for ${product.name}`, 'success');
    } else {
      // New line item creation
      const rawSub = 1 * product.price;
      const calculatedTax = rawSub * (product.taxPercent / 100);
      
      const newItem: InvoiceItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: 1,
        unitPrice: product.price,
        tax: Number(calculatedTax.toFixed(2)),
        amount: Number((rawSub + calculatedTax).toFixed(2))
      };
      setLineItems([...lineItems, newItem]);
      onShowNotification(`Added ${product.name} to invoice`, 'success');
    }

    setProductSearch('');
    setShowProductDropdown(false);
    setLastRemovedItem(null); // Clear undo state
  };

  // Modify item quantities or pricing on the fly
  const handleUpdateItemValue = (index: number, field: 'qty' | 'unitPrice', value: number) => {
    if (value < 0 || (field === 'qty' && value === 0)) return; // prevent negatives or zero quantity

    const updated = [...lineItems];
    const item = updated[index];
    
    // Lookup product to reference tax percentages
    const originalProduct = products.find((p) => p.id === item.productId);
    const taxPercent = originalProduct ? originalProduct.taxPercent : 0;

    let targetQty = item.qty;
    let targetPrice = item.unitPrice;

    if (field === 'qty') {
      targetQty = value;
      // Alert when user requests more than stocks
      if (originalProduct?.inStock !== undefined && value > originalProduct.inStock) {
        onShowNotification(`Warning: Only ${originalProduct.inStock} units are registered in database`, 'error');
      }
    } else {
      targetPrice = value;
    }

    const rawSub = targetQty * targetPrice;
    const calculatedTax = rawSub * (taxPercent / 100);

    updated[index] = {
      ...item,
      qty: targetQty,
      unitPrice: targetPrice,
      tax: Number(calculatedTax.toFixed(2)),
      amount: Number((rawSub + calculatedTax).toFixed(2))
    };

    setLineItems(updated);
  };

  // Deletion logic with single-click and undo mitigation
  const handleRemoveItem = (index: number) => {
    const itemToRemove = lineItems[index];
    setLastRemovedItem({
      item: itemToRemove,
      index
    });

    const updated = lineItems.filter((_, idx) => idx !== index);
    setLineItems(updated);
    onShowNotification(`Removed "${itemToRemove.name}" from billing list.`, 'success');
  };

  // Undo removal operation
  const handleUndoRemove = () => {
    if (lastRemovedItem) {
      const updated = [...lineItems];
      updated.splice(lastRemovedItem.index, 0, lastRemovedItem.item);
      setLineItems(updated);
      setLastRemovedItem(null);
      onShowNotification('Item restored in items list successfully.', 'success');
    }
  };

  // Live calculation states
  const invoiceCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;

    lineItems.forEach((item) => {
      subtotal += item.qty * item.unitPrice;
      totalTax += item.tax;
    });

    let discount = 0;
    if (discountType === 'percentage') {
      discount = Number((subtotal * (discountValue / 100)).toFixed(2));
    } else {
      discount = Number(discountValue.toFixed(2));
    }

    // Grand total = subtotal + totalTax - discount (ensuring it never falls below zero)
    const total = Math.max(0, Number((subtotal + totalTax - discount).toFixed(2)));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      discount,
      total
    };
  }, [lineItems, discountType, discountValue]);

  // Validation before proceed to Checkout
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!customer.name.trim()) {
      errors.name = "Customer's name is required for receipts.";
    }

    if (!customer.phone.trim()) {
      errors.phone = 'Mobile contact number is required.';
    } else if (!/^\+?[0-9\s\-]{10,13}$/.test(customer.phone.trim())) {
      errors.phone = 'Please provide a valid 10-digit phone number.';
    }

    if (customer.gst && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customer.gst.trim().toUpperCase())) {
      // Basic Indian GST validation
      errors.gst = 'Format must match standard 15-character GSTIN structure.';
    }

    if (Object.keys(errors).length > 0) {
      setCustomerErrors(errors);
      onShowNotification('Please resolve incorrect customer details.', 'error');
      return;
    }

    if (lineItems.length === 0) {
      onShowNotification('Please add at least one catalog item to process invoice.', 'error');
      return;
    }

    // Set errors blank and build step payload
    setCustomerErrors({});
    onProceedToCheckout({
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        gst: customer.gst?.trim().toUpperCase(),
        address: customer.address?.trim() || undefined
      },
      items: lineItems,
      subtotal: invoiceCalculations.subtotal,
      totalTax: invoiceCalculations.totalTax,
      discount: discountValue,
      discountType,
      total: invoiceCalculations.total,
      paymentMethod: 'Cash' // defaults to cash, changes selectable at checkout view
    });
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-800">
            Billing Terminal
          </h1>
          <p className="text-sm font-sans text-slate-500 mt-1">
            Generate and compute electronic retail invoices in real-time.
          </p>
        </div>
        <div className="bg-rose-50 text-crimson px-4 py-2 border border-rose-100 rounded-lg shadow-sm">
          <p className="text-[10px] text-rose-500 uppercase font-sans font-semibold tracking-wider">
            Sequential Invoice ID
          </p>
          <p className="text-sm font-semibold font-mono tracking-tight text-[15px]">
            {nextInvoiceNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Customer metadata + Invoice line items building */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Customer Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-soft p-5 space-y-4">
            <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <UserCheck className="w-4 h-4 text-crimson" />
              Customer Ledger Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Recipient Name*
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  placeholder="e.g. Ramesh Krishnan"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 text-sm ${
                    customerErrors.name ? 'border-rose-450 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                  }`}
                />
                {customerErrors.name && (
                  <p id="customer-name-error" className="text-crimson text-xs font-semibold mt-1">{customerErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Mobile Phone Number*
                </label>
                <input
                  id="customer-phone-input"
                  type="text"
                  placeholder="e.g. 9840123456"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all placeholder:text-slate-400 text-sm ${
                    customerErrors.phone ? 'border-rose-450 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-crimson focus:ring-1 focus:ring-crimson'
                  }`}
                />
                {customerErrors.phone && (
                  <p id="customer-phone-error" className="text-crimson text-xs font-semibold mt-1">{customerErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  GST Registration Number (GSTIN - Optional)
                </label>
                <input
                  id="customer-gst-input"
                  type="text"
                  placeholder="e.g. 33AAAAA1111A1Z1"
                  value={customer.gst}
                  onChange={(e) => setCustomer({ ...customer, gst: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none uppercase transition-all placeholder:text-slate-400 text-sm ${
                    customerErrors.gst ? 'border-rose-450 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-crimson'
                  }`}
                />
                {customerErrors.gst && (
                  <p id="customer-gst-error" className="text-crimson text-xs font-semibold mt-1">{customerErrors.gst}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Billing Address (Optional)
                </label>
                <input
                  id="customer-address-input"
                  type="text"
                  placeholder="Street name, landmark, town"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-crimson rounded-md focus:outline-none transition-all placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Card: Active Billing Line items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-soft p-5 space-y-4">
            
            {/* Inner row: Interactive Product Lookup Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Product Search & SKU Picker
              </label>
              
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    id="billing-sku-search"
                    type="text"
                    placeholder="Type name, SKU code or category to search electrical parts..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-crimson focus:bg-white focus:outline-none rounded-lg text-sm text-slate-700 transition-all font-sans placeholder:text-slate-400"
                  />
                </div>

                {/* Autocomplete Dropdown list */}
                {showProductDropdown && productSearch.trim().length > 0 && (
                  <div
                    id="billing-search-dropdown"
                    className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-150 font-sans"
                  >
                    {filteredSearchProducts.length > 0 ? (
                      filteredSearchProducts.map((p) => {
                        const inStock = p.inStock !== undefined ? p.inStock : 0;
                        const outOfStock = p.inStock !== undefined && p.inStock <= 0;
                        return (
                          <div
                            id={`dropdown-product-${p.id}`}
                            key={p.id}
                            onClick={() => !outOfStock && handleAddProduct(p)}
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              outOfStock
                                ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                : 'hover:bg-rose-50/40 text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-800 text-[13px]">
                                {p.name}
                              </p>
                              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                                SKU: {p.sku} • Category: {p.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800 text-[13px]">
                                ₹{p.price.toFixed(2)}
                              </p>
                              <p className={`text-[10px] font-semibold mt-0.5 ${p.inStock !== undefined ? (p.inStock > 0 ? 'text-emerald-600' : 'text-crimson') : 'text-slate-400'}`}>
                                {p.inStock !== undefined ? `${p.inStock} Available` : 'Stock Not Tracked'} • {p.taxPercent}% GST
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-4 text-center text-slate-400 text-xs">
                        No catalog items found matching query. Use "Products Catalog" to add SKUs.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Line items layout table */}
            <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2 pb-1 border-b border-slate-100">
              <ShoppingCart className="w-4 h-4 text-crimson" />
              Receipt Particulars
            </h3>

            {/* Undo Deletion Banner Banner */}
            {lastRemovedItem && (
              <div
                id="undo-removal-banner"
                className="bg-cream/50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs text-amber-900 animate-fade-in font-sans"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>
                    Removed item <strong className="font-bold">"{lastRemovedItem.item.name}"</strong>.
                  </span>
                </div>
                <button
                  id="undo-removal-action"
                  type="button"
                  onClick={handleUndoRemove}
                  className="flex items-center gap-1 bg-white border border-amber-300 hover:bg-amber-100 font-semibold px-2.5 py-1 rounded text-amber-850 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">
                      Particulars (SKU / Name)
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-widest text-[10px] w-24">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-widest text-[10px] w-28">
                      Unit Price (₹)
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-widest text-[10px] w-20">
                      GST (₹)
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-widest text-[10px] w-28">
                      Net Amount (₹)
                    </th>
                    <th className="px-4 py-2.5 w-12 text-center" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] font-sans">
                  {lineItems.length > 0 ? (
                    lineItems.map((item, index) => (
                      <tr key={item.productId} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                            SKU Snapshot: {item.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            id={`quantity-item-${index}`}
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateItemValue(index, 'qty', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-16 px-1.5 py-1 text-center font-bold border border-slate-200 focus:border-crimson rounded focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            id={`price-item-${index}`}
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateItemValue(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-1.5 py-1 font-semibold text-slate-700 border border-slate-200 focus:border-crimson rounded focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-500">
                          ₹{item.tax.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            id={`remove-item-${index}`}
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 rounded text-slate-400 hover:text-crimson hover:bg-rose-50 transition-all"
                            title="Remove line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                        The particular billing ledger is empty. Search and tap items above to proceed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Ledger summary, discounts & Navigation actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-soft p-5 space-y-4">
            <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <CreditCard className="w-4 h-4 text-crimson" />
              Calculations Summary
            </h3>

            {/* Calculations items stack */}
            <div className="space-y-3 font-sans text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal (Net Value)</span>
                <span className="font-semibold text-slate-800">
                  ₹{invoiceCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-3">
                <span>Total Tax Amount (GST)</span>
                <span className="font-medium text-slate-700">
                  + ₹{invoiceCalculations.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Discount Modifier Interface */}
              <div className="space-y-2 py-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Apply Receipt Discount
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="discount-type-selector"
                    value={discountType}
                    onChange={(e) => {
                      setDiscountType(e.target.value as 'percentage' | 'fixed');
                      setDiscountValue(0);
                    }}
                    className="px-2 py-1.5 border border-slate-200 bg-slate-50 focus:outline-none rounded text-xs text-slate-700"
                  >
                    <option value="fixed">Fixed ₹</option>
                    <option value="percentage">Percent %</option>
                  </select>
                  <input
                    id="discount-value-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue || ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      setDiscountValue(isNaN(num) || num < 0 ? 0 : num);
                    }}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 focus:border-crimson focus:outline-none rounded text-xs font-semibold text-slate-800 text-right"
                  />
                </div>
              </div>

              {invoiceCalculations.discount > 0 && (
                <div className="flex items-center justify-between text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-100">
                  <span>Subtracted Discount:</span>
                  <span className="font-semibold">
                    - ₹{invoiceCalculations.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Grand Total output with large design styling */}
              <div className="border-t border-slate-100 pt-3 flex items-baseline justify-between text-slate-800 leading-none">
                <span className="text-sm font-semibold">Grand Total:</span>
                <span className="text-xl font-bold font-serif text-crimson">
                  ₹{invoiceCalculations.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit Proceed Button */}
            <button
              id="proceed-checkout-btn"
              type="submit"
              className="w-full bg-crimson hover:bg-red-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm group text-xs tracking-wider uppercase"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
