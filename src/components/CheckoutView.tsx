import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, CreditCard, CheckCircle, Save } from 'lucide-react';
import { Invoice, ShopDetails } from '../types';
import InvoiceTemplate, { InvoiceTemplateData } from './InvoiceTemplate';

interface CheckoutViewProps {
  checkoutInvoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'time' | 'status'>;
  nextInvoiceNumber: string;
  shopDetails: ShopDetails;
  onConfirmCheckout: (completedInvoice: Invoice) => void;
  onBackToEdit: () => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
  onSetPrintInvoiceSnapshot?: (invoice: Invoice) => void;
}

export default function CheckoutView({
  checkoutInvoice,
  nextInvoiceNumber,
  shopDetails,
  onConfirmCheckout,
  onBackToEdit,
  onShowNotification,
  onSetPrintInvoiceSnapshot
}: CheckoutViewProps) {
  const [paymentMethod, setPaymentMethod] = useState<Invoice['paymentMethod']>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize editable WYSIWYG template state from currently prepared selections
  const [templateData, setTemplateData] = useState<InvoiceTemplateData>(() => {
    const fullAddress = checkoutInvoice.customer.address || '';
    const addressLines = fullAddress.split('\n');
    const address1 = addressLines[0] || '123 Main Street';
    const address2 = addressLines[1] || 'Apartment 4B';
    const cityStateZip = addressLines.slice(2).join(', ') || 'Chennai, TN 600001';

    const itemsMapped = checkoutInvoice.items.map((item) => {
      // Back-calculate raw tax rate
      const taxPercent = item.qty * item.unitPrice > 0 
        ? Math.round((item.tax / (item.qty * item.unitPrice)) * 100)
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

    const now = new Date();
    const invoiceDateStr = now.toISOString().slice(0, 10);
    const dueTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueTime.toISOString().slice(0, 10);

    return {
      invoiceNumber: nextInvoiceNumber,
      invoiceDate: invoiceDateStr,
      dueDate: dueDateStr,
      poNumber: 'PO-12345',
      reference: 'REF-001',
      paymentDueIn: '30 Days',
      customer: {
        name: checkoutInvoice.customer.name,
        address1: address1,
        address2: address2,
        cityStateZip: cityStateZip,
        phone: checkoutInvoice.customer.phone,
        email: 'eemanimuthu79@gmail.com', // fallback default
        gst: checkoutInvoice.customer.gst
      },
      items: itemsMapped,
      subtotal: checkoutInvoice.subtotal,
      discount: {
        type: checkoutInvoice.discountType || 'percentage',
        value: checkoutInvoice.discountType === 'percentage' ? 5 : checkoutInvoice.discount,
        amount: checkoutInvoice.discount
      },
      shipping: 50, // default corporate shipping charge
      cgst: parseFloat((checkoutInvoice.subtotal * 0.09).toFixed(2)),
      sgst: parseFloat((checkoutInvoice.subtotal * 0.09).toFixed(2)),
      total: checkoutInvoice.total,
      paymentMethod: 'Cash',
      paymentTerms: 'Payment within 30 days'
    };
  });

  // Keep track of internal changes made inside the template editor
  const handleTemplateUpdate = (updatedTemplate: InvoiceTemplateData) => {
    setTemplateData(updatedTemplate);

    // Sync draft updates immediately to the paper print spooled snapshot
    if (onSetPrintInvoiceSnapshot) {
      const draftInvoice: Invoice = {
        id: 'inv-temp',
        invoiceNumber: updatedTemplate.invoiceNumber,
        date: updatedTemplate.invoiceDate,
        time: '12:00',
        customer: {
          name: updatedTemplate.customer.name,
          phone: updatedTemplate.customer.phone,
          gst: updatedTemplate.customer.gst,
          address: `${updatedTemplate.customer.address1}\n${updatedTemplate.customer.address2}\n${updatedTemplate.customer.cityStateZip}`
        },
        items: updatedTemplate.items.map((item, idx) => ({
          productId: `draft-it-${idx}`,
          sku: item.sku,
          name: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          tax: item.taxAmount,
          amount: item.amount
        })),
        subtotal: updatedTemplate.subtotal,
        totalTax: updatedTemplate.cgst + updatedTemplate.sgst,
        discount: updatedTemplate.discount.amount,
        discountType: updatedTemplate.discount.type,
        total: updatedTemplate.total,
        paymentMethod: paymentMethod,
        status: 'Paid'
      };
      onSetPrintInvoiceSnapshot(draftInvoice);
    }
  };

  // Compile final values, synchronize, record database log
  const handleSaveAndFinalize = () => {
    setIsSubmitting(true);
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${mins}`;

    // Map template data items back to Database model
    const itemsMappedBack = templateData.items.map((item, idx) => {
      const originalItem = checkoutInvoice.items[idx];
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

    const finalRecord: Invoice = {
      id: `inv-rec-${Date.now()}`,
      invoiceNumber: templateData.invoiceNumber,
      date: templateData.invoiceDate,
      time: formattedTime,
      customer: {
        name: templateData.customer.name,
        phone: templateData.customer.phone,
        gst: templateData.customer.gst,
        address: `${templateData.customer.address1}\n${templateData.customer.address2}\n${templateData.customer.cityStateZip}`
      },
      items: itemsMappedBack,
      subtotal: templateData.subtotal,
      totalTax: templateData.cgst + templateData.sgst,
      discount: templateData.discount.amount,
      discountType: templateData.discount.type,
      total: templateData.total,
      paymentMethod,
      status: 'Paid'
    };

    try {
      onConfirmCheckout(finalRecord);
      onShowNotification(`Sales transaction ${templateData.invoiceNumber} recorded and finalized!`, 'success');
      setIsSubmitting(false);
    } catch (err) {
      onShowNotification('Transaction checkout commit failures.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto flex flex-col">
      {/* Upper Navigation Stack Header */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEdit}
            className="p-2 bg-white hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
            title="Return to Invoice Builder"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-sans text-slate-400 font-bold tracking-wider uppercase">
              <span>Billing Terminal</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-blue-600 font-semibold">Verify & Settle Accounts</span>
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-800 mt-1">
              Final Checkout Settlement
            </h1>
          </div>
        </div>

        {/* Rapid Settlement Options Panel right hand side */}
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Channel:</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as Invoice['paymentMethod'])}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Cash">💵 Cold Cash Receipt</option>
              <option value="UPI">📱 Instant UPI / QR Transfer</option>
              <option value="Card">💳 Credit/Debit POS Terminal</option>
              <option value="Cheque">🏦 Bank Cheque Deposit</option>
            </select>
          </div>

          <button
            onClick={handleSaveAndFinalize}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg flex items-center text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Archiving...' : 'Confirm & Save Receipt'}
          </button>
        </div>
      </div>

      {/* Main View Grid: Left column holds details summary panel, right holds the A4 Template */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Ledger control panels */}
        <div className="lg:col-span-1 space-y-6 no-print">
          {/* Quick Ledger breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-soft">
            <h3 className="font-serif font-bold text-sm text-slate-800 uppercase border-b border-slate-100 pb-2 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
              Settlement Ledger
            </h3>

            <div className="space-y-3.5 text-xs font-sans text-slate-650">
              <div className="flex justify-between">
                <span>Consolidated Net:</span>
                <span className="font-semibold text-slate-800">₹{templateData.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Aggregate GST (18%):</span>
                <span className="font-semibold text-slate-700">+ ₹{(templateData.cgst + templateData.sgst).toFixed(2)}</span>
              </div>

              {templateData.discount.amount > 0 && (
                <div className="flex justify-between text-emerald-800 bg-emerald-50 px-2 py-1.5 rounded">
                  <span>Applied Discounts:</span>
                  <span className="font-bold">- ₹{templateData.discount.amount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping fee:</span>
                <span className="font-mono">₹{templateData.shipping.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-200/60 pt-3 flex items-baseline justify-between text-slate-900 font-extrabold text-sm">
                <span>Grand Total Due:</span>
                <span className="text-[16px] text-[#B40023]">₹{templateData.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={handleSaveAndFinalize}
                disabled={isSubmitting}
                className="w-full bg-[#B40023] hover:bg-[#90001C] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmitting ? 'Finalizing Invoice...' : 'Finish & Save to Log'}
              </button>
            </div>
          </div>

          {/* Quick billing tips box */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-2">
            <h4 className="text-blue-800 text-[11px] font-bold tracking-wider uppercase">WYSIWYG Editorial Tips</h4>
            <p className="text-[10px] text-slate-500 leading-normal">
              You can click <strong className="text-slate-700">"Edit Invoice"</strong> on the right container to modify values, product names, prices, and taxes dynamically before saving or printing.
            </p>
          </div>
        </div>

        {/* Right Side / Centered: Highly Polished, Printable Invoice */}
        <div className="lg:col-span-3">
          <InvoiceTemplate
            initialInvoiceData={templateData}
            onInvoiceUpdate={handleTemplateUpdate}
          />
        </div>
      </div>
    </div>
  );
}
