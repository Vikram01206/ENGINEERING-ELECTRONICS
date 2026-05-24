import React from 'react';
import { Invoice, ShopDetails } from '../types';

interface PrintTemplateProps {
  invoice: Invoice | null;
  shopDetails: ShopDetails;
}

export default function PrintTemplate({ invoice, shopDetails }: PrintTemplateProps) {
  if (!invoice) return null;

  // Compute CGST & SGST (9% each as per spec)
  const cgstAmount = parseFloat((invoice.subtotal * 0.09).toFixed(2));
  const sgstAmount = parseFloat((invoice.subtotal * 0.09).toFixed(2));
  
  // Back-calculate raw discount representation
  const discountAmount = invoice.discount || 0;

  return (
    <div
      id="invoice-print-container-a4"
      className="hidden print:block text-[#1F2937] bg-white w-[210mm] min-h-[297mm] p-10 font-sans tracking-wide text-[12px] relative box-border"
      style={{ width: '210mm', minHeight: '297mm' }}
    >
      {/* Watermark logo for elite brand feel */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
        <h1 className="font-serif text-[110px] font-extrabold tracking-widest uppercase">ENGINEERING</h1>
      </div>

      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Top Brand Header bar block */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6 relative">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-[20px] font-bold tracking-tight text-blue-700 font-serif leading-tight">
                  ENGINEERING ELECTRONICS
                </h1>
                <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                  TIN: 33223824729 | GST: 33BUIPM9249J1Z4
                </p>
              </div>
            </div>

            <div className="text-right">
              {/* Force blue background to preserve print colors */}
              <div 
                className="text-white font-serif font-extrabold text-[24px] uppercase tracking-wider px-6 py-2 rounded-l-lg shadow-sm -mr-10 transform skew-x-3 inline-block bg-blue-600"
                style={{ backgroundColor: '#0052CC', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                INVOICE
              </div>
            </div>
          </div>

          {/* Client profile vs Store details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 border border-slate-250/50 rounded-lg" style={{ backgroundColor: '#F9FAFB', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-3 font-sans">
                BILL TO:
              </h4>
              <div className="space-y-1 text-slate-800">
                <p className="text-[14px] font-extrabold text-slate-900">{invoice.customer.name}</p>
                {/* Render address split if containing newlines */}
                {invoice.customer.address ? (
                  invoice.customer.address.split('\n').map((line, idx) => (
                    <p key={idx} className="text-[12px]">{line}</p>
                  ))
                ) : (
                  <>
                    <p className="text-[12px]">Address Line 1</p>
                    <p className="text-[12px]">Address Line 2</p>
                  </>
                )}
                <p className="text-[12px] font-medium text-slate-500">Phone: {invoice.customer.phone}</p>
                {invoice.customer.gst && (
                  <p className="text-[11px] font-mono font-bold mt-1 text-blue-700">Client GST: {invoice.customer.gst}</p>
                )}
              </div>
            </div>

            <div className="text-right space-y-2 text-[12px] text-slate-600 pr-2">
              <div className="flex justify-end items-start">
                <span className="font-semibold text-slate-805 text-right">
                  513, Thiruvalluvar Nagar,<br />
                  Sarfoji College P.O.,<br />
                  Thanjavur - 613 005
                </span>
              </div>
              <div className="text-slate-500 pt-1">
                <p><strong>Phone:</strong> +91 99946 74345, 63829 52106</p>
                <p><strong>Email:</strong> eemanimuthu79@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Metadata ledger boxes */}
          <div 
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-y-3 gap-x-6 text-[12px] mb-8"
            style={{ backgroundColor: '#F9FAFB', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Invoice No.</span>
                <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">PO Number</span>
                <span className="font-medium text-slate-800">PO-12345</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Reference</span>
                <span className="font-medium text-slate-800">REF-001</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Invoice Date</span>
                <span className="font-mono font-medium text-slate-805">{invoice.date}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Payment Due By</span>
                <span className="font-mono font-medium text-slate-805">{invoice.date}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Payment Due In</span>
                <span className="font-medium text-slate-805">30 Days</span>
              </div>
            </div>
          </div>

          {/* Table list components */}
          <div className="mb-6">
            <table className="w-full border-collapse text-[12px] text-slate-800">
              <thead>
                <tr className="bg-blue-600 text-white font-semibold" style={{ backgroundColor: '#0052CC', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <th className="px-4 py-3 text-left uppercase tracking-wider w-[50%] text-white">Description</th>
                  <th className="px-4 py-3 text-center uppercase tracking-wider w-[12%] text-white">Quantity</th>
                  <th className="px-4 py-3 text-right uppercase tracking-wider w-[18%] text-white">Unit Price</th>
                  <th className="px-4 py-3 text-right uppercase tracking-wider w-[20%] text-white">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-300">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} | Tax 18%</p>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{item.qty}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing aggregates */}
          <div className="flex justify-end mb-8 block">
            <div className="w-80 space-y-2 border-t border-slate-200/80 pt-3">
              <div className="flex justify-between items-center text-[12px] text-slate-600">
                <span>SUBTOTAL</span>
                <span className="font-mono font-semibold text-slate-800">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[12px] text-slate-600">
                <span>CGST (9%)</span>
                <span className="font-mono text-slate-705">+ ₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[12px] text-slate-600">
                <span>SGST (9%)</span>
                <span className="font-mono text-slate-705">+ ₹{sgstAmount.toFixed(2)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[12px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded" style={{ backgroundColor: '#ECFDF5', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span>DISCOUNT</span>
                  <span className="font-mono font-bold">- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[12px] text-slate-600">
                <span>SHIPPING & HANDLING</span>
                <span className="font-mono">₹50.00</span>
              </div>

              <div className="flex justify-between items-center bg-blue-50 text-[14px] font-bold text-blue-700 border-t border-b border-blue-200 py-2.5 px-3 rounded-lg" style={{ backgroundColor: '#EFF6FF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="font-serif">TOTAL DUE</span>
                <span className="font-mono text-[16px]">₹{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-2 gap-8 text-[12px] pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center space-x-1 pb-1 mb-2">
                <strong className="text-blue-700 uppercase tracking-wider font-sans">Payment terms:</strong>
                <span className="text-slate-800 ml-1">Payment within 30 days</span>
              </div>

              <div className="space-y-1.5 mt-3 text-slate-500 text-[11px]">
                <h4 className="text-slate-800 font-bold uppercase text-[10px] tracking-wider">Payment details:</h4>
                <p>Money transfer to the account below:</p>
                <table className="w-full text-left">
                  <tbody>
                    <tr>
                      <td className="text-slate-400 py-0.5 w-24">Bank Name</td>
                      <td className="font-bold text-slate-800 py-0.5">: Kotak Mahindra Bank Ltd.</td>
                    </tr>
                    <tr>
                      <td className="text-slate-400 py-0.5">Account Type</td>
                      <td className="font-bold text-slate-800 py-0.5">: Kotak Classic Current Account</td>
                    </tr>
                    <tr>
                      <td className="text-slate-400 py-0.5">Account No.</td>
                      <td className="font-bold text-slate-800 py-0.5 font-mono">: 5448080201</td>
                    </tr>
                    <tr>
                      <td className="text-slate-400 py-0.5">Branch</td>
                      <td className="font-bold text-slate-800 py-0.5">: Neelagiri Panchayat, Trichy Main Road</td>
                    </tr>
                    <tr>
                      <td className="text-slate-400 py-0.5">IFSC Code</td>
                      <td className="font-bold text-slate-800 py-0.5 font-mono">: KKBK0008758</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col justify-end items-end pr-4">
              <div className="text-center w-64">
                <p className="text-slate-400 border-b border-dashed border-slate-300 pb-12 font-mono" />
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-widest mt-2">
                  Authorized Signatory
                </p>
                <p className="text-[10px] text-slate-400">
                  ENGINEERING ELECTRONICS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Slogan note */}
        <div className="pt-2 border-t-2 border-blue-100 flex items-center justify-center text-center font-serif italic text-blue-800 text-[13px]" style={{ borderTopColor: '#DBEAFE', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <span>Thank you for your business!</span>
        </div>
      </div>
    </div>
  );
}
