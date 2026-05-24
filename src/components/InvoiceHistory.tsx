import React, { useState, useMemo } from 'react';
import { Search, Calendar, CreditCard, Eye, Printer, Download, Upload, SlidersHorizontal, EyeOff, Trash2, Edit2, ArrowLeft, X } from 'lucide-react';
import { Invoice, ShopDetails } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import InvoiceTemplate, { InvoiceTemplateData } from './InvoiceTemplate';
import StreetLampIcon from './StreetLampIcon';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  shopDetails: ShopDetails;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onSetPrintInvoiceSnapshot: (invoice: Invoice) => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function InvoiceHistory({
  invoices,
  shopDetails,
  onDeleteInvoice,
  onUpdateInvoice,
  onSetPrintInvoiceSnapshot,
  onShowNotification
}: InvoiceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorter variables
  const [sortField, setSortField] = useState <keyof Invoice> ('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Preview Modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Active Invoice for Edit/Download Template View
  const [activeEditInvoice, setActiveEditInvoice] = useState<Invoice | null>(null);

  // Deletion Modal/State
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const handleDeleteConfirm = () => {
    if (invoiceToDelete) {
      onDeleteInvoice(invoiceToDelete.id);
      onShowNotification(`Receipt ${invoiceToDelete.invoiceNumber} has been deleted successfully.`, 'success');
      setInvoiceToDelete(null);
    }
  };

  // Sorting handlers
  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter computations
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Base Search: Invoice ID, Customer, Name, GST Number, Address
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customer.name.toLowerCase().includes(query) ||
        inv.customer.phone.includes(query) ||
        inv.total.toString().includes(query);

      // Payment Method type filter
      const matchesPayment =
        paymentMethodFilter === 'All' || inv.paymentMethod === paymentMethodFilter;

      // Date constraints
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && inv.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && inv.date <= endDate;
      }

      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [invoices, searchTerm, paymentMethodFilter, startDate, endDate]);

  // Sort logic applied
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const order = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? order : -order;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredInvoices, sortField, sortDirection]);

  // Handle instant reprint operation
  const handleInstantReprint = (invoice: Invoice) => {
    onSetPrintInvoiceSnapshot(invoice);
    onShowNotification(`Prepared reprint layout for ${invoice.invoiceNumber}. Launching browser print...`, 'success');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const openInvoiceDetailsModal = (invoice: Invoice) => {
    setViewingInvoice(invoice);
  };

  // Helper mapping and state saving functions for WYSIWYG editing
  const mapInvoiceToTemplateData = (invoice: Invoice): InvoiceTemplateData => {
    const fullAddress = invoice.customer.address || '';
    const addressLines = fullAddress.split('\n');
    const address1 = addressLines[0] || '';
    const address2 = addressLines[1] || '';
    const cityStateZip = addressLines.slice(2).join(', ') || '';

    const itemsMapped = invoice.items.map((item) => {
      const parentPrice = item.qty * item.unitPrice;
      const taxPercent = parentPrice > 0 
        ? Math.round((item.tax / parentPrice) * 100)
        : 18;
      return {
        sku: item.sku,
        description: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        taxPercent: taxPercent,
        taxAmount: item.tax,
        amount: item.amount
      };
    });

    const cgst = parseFloat((invoice.totalTax / 2).toFixed(2));
    const sgst = parseFloat((invoice.totalTax / 2).toFixed(2));

    const discountType = invoice.discountType || 'percentage';
    const discountAmount = invoice.discount;
    let discountValue = discountAmount;
    if (discountType === 'percentage' && invoice.subtotal > 0) {
      discountValue = parseFloat(((discountAmount / invoice.subtotal) * 100).toFixed(1));
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.date,
      dueDate: invoice.date,
      poNumber: 'PO-12345',
      reference: 'REF-001',
      paymentDueIn: '30 Days',
      customer: {
        name: invoice.customer.name,
        address1: address1,
        address2: address2,
        cityStateZip: cityStateZip,
        phone: invoice.customer.phone,
        email: 'eemanimuthu79@gmail.com',
        gst: invoice.customer.gst
      },
      items: itemsMapped,
      subtotal: invoice.subtotal,
      discount: {
        type: discountType,
        value: discountValue,
        amount: discountAmount
      },
      shipping: 0,
      cgst: cgst,
      sgst: sgst,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
      paymentTerms: 'Payment within 30 days'
    };
  };

  const handleSaveEditedInvoice = (invoiceId: string, updatedTemplate: InvoiceTemplateData) => {
    const originalInvoice = invoices.find((inv) => inv.id === invoiceId);
    if (!originalInvoice) return;

    const itemsMappedBack = updatedTemplate.items.map((item, idx) => {
      const originalItem = originalInvoice.items[idx];
      const productId = originalItem ? originalItem.productId : `prod-gen-${Date.now()}-${idx}`;
      return {
        productId,
        sku: item.sku,
        name: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        tax: item.taxAmount,
        amount: item.amount
      };
    });

    const updatedInvoice: Invoice = {
      ...originalInvoice,
      invoiceNumber: updatedTemplate.invoiceNumber,
      date: updatedTemplate.invoiceDate,
      customer: {
        name: updatedTemplate.customer.name,
        phone: updatedTemplate.customer.phone,
        gst: updatedTemplate.customer.gst,
        address: `${updatedTemplate.customer.address1}\n${updatedTemplate.customer.address2}\n${updatedTemplate.customer.cityStateZip}`
      },
      items: itemsMappedBack,
      subtotal: updatedTemplate.subtotal,
      totalTax: updatedTemplate.cgst + updatedTemplate.sgst,
      discount: updatedTemplate.discount.amount,
      discountType: updatedTemplate.discount.type,
      total: updatedTemplate.total,
      paymentMethod: updatedTemplate.paymentMethod as Invoice['paymentMethod'] || originalInvoice.paymentMethod,
    };

    onUpdateInvoice(updatedInvoice);
    onShowNotification(`Receipt ${updatedInvoice.invoiceNumber} has been updated successfully.`, 'success');
  };

  if (activeEditInvoice) {
    return (
      <div className="space-y-6">
        <InvoiceTemplate
          initialInvoiceData={mapInvoiceToTemplateData(activeEditInvoice)}
          onBack={() => setActiveEditInvoice(null)}
          onInvoiceUpdate={(updatedTemplate) => handleSaveEditedInvoice(activeEditInvoice.id, updatedTemplate)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-800">
            Billing & Sales Ledger
          </h1>
          <p className="text-sm font-sans text-slate-500 mt-1">
            Search, filter, reprint, and verify previously finalized electronic transactions.
          </p>
        </div>
      </div>

      {/* Advanced search & range filters */}
      <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-soft space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          Filter Criteria
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
          
          {/* Main search text box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search by receipt ID, phone or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-crimson focus:bg-white focus:outline-none rounded-lg text-sm text-slate-700 transition-all font-medium placeholder:text-slate-400 animate-fade-in"
            />
          </div>

          {/* Payment dropdown filter */}
          <div>
            <select
              id="history-payment-filter"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-crimson focus:outline-none rounded-lg text-sm text-slate-700 font-bold transition-all cursor-pointer bg-white"
            >
              <option value="All">All Payment Channels</option>
              <option value="Cash">💵 Cash Only</option>
              <option value="UPI">📱 UPI Only</option>
              <option value="Card">💳 Cards Only</option>
              <option value="Cheque">🏦 Cheque Only</option>
            </select>
          </div>

          {/* Settle button indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block shrink-0">Show:</span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold text-[11px] uppercase tracking-wider">
              {filteredInvoices.length} transactions
            </span>
          </div>
        </div>

        {/* Date fields row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 border-t border-slate-100 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Start Date
            </label>
            <input
              id="history-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 focus:border-crimson rounded-md focus:outline-none text-xs text-slate-700 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              End Date
            </label>
            <input
              id="history-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 focus:border-crimson rounded-md focus:outline-none text-xs text-slate-700 font-semibold"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            {(startDate || endDate || searchTerm || paymentMethodFilter !== 'All') && (
              <button
                id="reset-filters"
                onClick={() => {
                  setSearchTerm('');
                  setPaymentMethodFilter('All');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-crimson font-bold hover:underline transition-all py-2 px-3 hover:bg-rose-50 rounded"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500">
                <th
                  onClick={() => handleSort('invoiceNumber')}
                  className="px-6 py-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  Receipt ID
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="px-6 py-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-crimson select-none"
                >
                  Date / Time
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">
                  Client Description
                </th>
                <th
                  onClick={() => handleSort('paymentMethod')}
                  className="px-6 py-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-crimson select-none text-center"
                >
                  Payment Mode
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="px-6 py-4 font-semibold uppercase tracking-wider cursor-pointer hover:text-crimson select-none text-right"
                >
                  Total Due (₹)
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right w-36">
                  Receipt Operations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-sans text-slate-700">
              {sortedInvoices.length > 0 ? (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      <div>{inv.date}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{inv.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{inv.customer.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{inv.customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                        inv.paymentMethod === 'Cash'
                          ? 'bg-emerald-50 text-emerald-705'
                          : inv.paymentMethod === 'UPI'
                          ? 'bg-blue-50 text-blue-705'
                          : inv.paymentMethod === 'Card'
                          ? 'bg-violet-50 text-violet-705'
                          : 'bg-amber-50 text-amber-805'
                      }`}>
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-right text-slate-800">
                      ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`hist-edit-${inv.invoiceNumber}`}
                          onClick={() => setActiveEditInvoice(inv)}
                          className="p-1 px-2 border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Edit and Download Invoice/PDF"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit & Download
                        </button>
                        <button
                          id={`hist-view-${inv.invoiceNumber}`}
                          onClick={() => openInvoiceDetailsModal(inv)}
                          className="p-1.5 border border-slate-200 hover:border-crimson hover:bg-rose-50 text-slate-600 hover:text-crimson text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Review Receipt Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          id={`hist-print-${inv.invoiceNumber}`}
                          onClick={() => handleInstantReprint(inv)}
                          className="p-1.5 text-slate-600 hover:text-crimson hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Instant Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          id={`hist-delete-${inv.invoiceNumber}`}
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Delete Receipt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 leading-normal font-sans">
                    No historical logs match your current parameters. Reset criteria to display previous ledgers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Styled Invoice Viewer Detail Modal */}
      {viewingInvoice && (
        <div
          id="invoice-details-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        >
          <div
            id="invoice-details-container"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-in"
            role="dialog"
            aria-modal="true"
          >
            {/* Header section with print & dismiss controls */}
            <div className="bg-cream border-b border-red-100 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-crimson font-serif text-lg font-bold">
                <StreetLampIcon className="w-5 h-5 text-crimson" />
                <span>Transaction details {viewingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="modal-print-btn"
                  onClick={() => handleInstantReprint(viewingInvoice)}
                  className="px-3.5 py-1.5 bg-crimson hover:bg-red-800 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Reprint
                </button>
                <button
                  id="modal-dismiss-btn"
                  onClick={() => setViewingInvoice(null)}
                  className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-black hover:border-slate-404 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-bounce-subtle"
                  title="Close Viewer"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Area */}
            <div className="overflow-y-auto p-6 space-y-6 text-xs font-sans text-slate-700">
              
              {/* Row 1: Store profile vs Invoice metadata */}
              <div className="grid grid-cols-2 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-serif font-bold text-sm text-slate-800 uppercase">{shopDetails.name}</h4>
                  <p className="text-slate-550 max-w-[200px] leading-relaxed mt-1 text-[11px]">{shopDetails.address}</p>
                  <p className="text-slate-550 mt-1">Tel: {shopDetails.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Invoice Number</p>
                  <p className="text-sm font-bold font-mono text-crimson mt-1">{viewingInvoice.invoiceNumber}</p>
                  
                  <div className="grid grid-cols-2 gap-y-1 mt-4 text-right">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-450">Date Issued</p>
                      <p className="font-medium text-slate-800 font-mono text-[11px]">{viewingInvoice.date}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-450">Session Time</p>
                      <p className="font-medium text-slate-800 font-mono text-[11px]">{viewingInvoice.time}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Customer snapshots */}
              <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-y-3">
                <div>
                  <h5 className="font-serif font-semibold text-slate-450 uppercase text-[10px] tracking-widest leading-none mb-1.5">Recipient Profile</h5>
                  <p className="font-bold text-slate-800 text-[13px]">{viewingInvoice.customer.name}</p>
                  <p className="text-slate-500 font-medium font-mono text-[11px] mt-0.5">{viewingInvoice.customer.phone}</p>
                </div>
                {viewingInvoice.customer.gst && (
                  <div>
                    <h5 className="font-serif font-semibold text-slate-450 uppercase text-[10px] tracking-widest leading-none mb-1.5">GST Registration</h5>
                    <p className="font-bold font-mono text-crimson text-xs uppercase">{viewingInvoice.customer.gst}</p>
                  </div>
                )}
                {viewingInvoice.customer.address && (
                  <div className="col-span-2 border-t border-slate-200/50 pt-2.5">
                    <h5 className="font-serif font-semibold text-slate-450 uppercase text-[10px] tracking-widest leading-none mb-1.5 font-sans">Corporate Address</h5>
                    <p className="text-slate-600 leading-normal leading-relaxed">{viewingInvoice.customer.address}</p>
                  </div>
                )}
              </div>

              {/* Row 3: Table snapshot */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Items Included</h5>
                <table className="w-full text-left border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-550 border-b border-slate-200">
                      <th className="px-3 py-2">Item Particulars</th>
                      <th className="px-3 py-2 text-center w-14">Qty</th>
                      <th className="px-3 py-2 text-right w-24">Unit (₹)</th>
                      <th className="px-3 py-2 text-right w-20">Tax (₹)</th>
                      <th className="px-3 py-2 text-right w-24">Net (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px]">
                    {viewingInvoice.items.map((it) => (
                      <tr key={it.productId} className="hover:bg-slate-50/20">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{it.name}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5 font-bold uppercase">SKU: {it.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-center font-medium">{it.qty}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{it.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">₹{it.tax.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Row 4: Pricing breakdown */}
              <div className="border-t border-slate-100 pt-4 flex flex-col items-end space-y-2">
                <div className="w-64 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-800">₹{viewingInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                    <span>CGST + SGST tax total</span>
                    <span className="font-medium text-slate-800">+ ₹{viewingInvoice.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {viewingInvoice.discount > 0 && (
                    <div className="flex items-center justify-between text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                      <span>Applied Discount</span>
                      <span className="font-semibold">- ₹{viewingInvoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between text-slate-900 border-t border-slate-150 pt-2 font-bold leading-none">
                    <span className="text-sm font-semibold">Total Paid:</span>
                    <span className="text-lg font-serif text-crimson">₹{viewingInvoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-right font-medium text-slate-400 pt-1">
                    Settled via <strong className="font-bold text-slate-600">{viewingInvoice.paymentMethod}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-end shrink-0">
              <button
                id="modal-close-lower"
                onClick={() => setViewingInvoice(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-black text-white font-bold text-xs rounded transition-all uppercase tracking-wider shadow cursor-pointer flex items-center gap-2 border border-slate-705"
              >
                <X className="w-3.5 h-3.5 text-white" />
                Dismiss Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={invoiceToDelete !== null}
        title="Delete Receipt Record"
        message={`Are you sure you want to delete invoice ${invoiceToDelete?.invoiceNumber} generated for ${invoiceToDelete?.customer.name}? This action is permanent and cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setInvoiceToDelete(null)}
        confirmText="Confirm Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
