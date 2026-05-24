import React, { useState, useEffect } from 'react';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredInvoices,
  saveStoredInvoices,
  getStoredShopDetails,
  saveStoredShopDetails,
  generateNextInvoiceNumber
} from './data';
import { Product, Invoice, ShopDetails } from './types';
import Sidebar from './components/Sidebar';
import ProductManager from './components/ProductManager';
import InvoiceBuilder from './components/InvoiceBuilder';
import CheckoutView from './components/CheckoutView';
import InvoiceHistory from './components/InvoiceHistory';
import SettingsPanel from './components/SettingsPanel';
import PrintTemplate from './components/PrintTemplate';
import Toast from './components/Toast';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'products' | 'new_invoice' | 'history' | 'settings'>('products');

  // Core Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shopDetails, setShopDetails] = useState<ShopDetails>({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Flow State
  const [checkoutInvoice, setCheckoutInvoice] = useState<Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'time' | 'status'> | null>(null);
  const [printInvoiceSnapshot, setPrintInvoiceSnapshot] = useState<Invoice | null>(null);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load state from localStorage on init
  useEffect(() => {
    setProducts(getStoredProducts());
    setInvoices(getStoredInvoices());
    setShopDetails(getStoredShopDetails());
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Product CRUD handlers
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const freshProduct: Product = {
      ...newProd,
      id: `prod-rec-${Date.now()}`
    };
    const updated = [freshProduct, ...products];
    setProducts(updated);
    saveStoredProducts(updated);
  };

  const handleEditProduct = (modifiedProd: Product) => {
    const updated = products.map((p) => (p.id === modifiedProd.id ? modifiedProd : p));
    setProducts(updated);
    saveStoredProducts(updated);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // Checkout workflow triggers
  const handleProceedToCheckout = (compiledInvoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'time' | 'status'>) => {
    setCheckoutInvoice(compiledInvoice);
    // Since print layout must be ready to accept the template values during printable media queries,
    // we also copy the placeholder info to active print state as a progressive loading measure.
    setPrintInvoiceSnapshot({
      ...compiledInvoice,
      id: 'inv-temp',
      invoiceNumber: generateNextInvoiceNumber(invoices),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      status: 'Paid'
    });
  };

  const handleConfirmCheckout = (completedRecord: Invoice) => {
    // 1. Save finalized invoice to historical records
    const updatedInvoices = [completedRecord, ...invoices];
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);

    // 2. Reduce matching product stocks automatically to keep inventory correct
    const updatedProducts = products.map((p) => {
      const purchasedItem = completedRecord.items.find((item) => item.productId === p.id);
      if (purchasedItem && p.inStock !== undefined) {
        const remaining = Math.max(0, p.inStock - purchasedItem.qty);
        return { ...p, inStock: remaining };
      }
      return p;
    });
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    // 3. Clear transient checkout queue, set print snapshot, redirect to history ledger
    setCheckoutInvoice(null);
    setPrintInvoiceSnapshot(completedRecord);
    setActiveTab('history');
  };

  const handleBackToEdit = () => {
    setCheckoutInvoice(null);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const updated = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updated);
    saveStoredInvoices(updated);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    const updated = invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    setInvoices(updated);
    saveStoredInvoices(updated);
  };

  // Settings handlers
  const handleUpdateShopDetails = (details: ShopDetails) => {
    setShopDetails(details);
    saveStoredShopDetails(details);
  };

  const handleImportBackup = (imported: { products: Product[]; invoices: Invoice[]; shopDetails: ShopDetails }) => {
    setProducts(imported.products);
    saveStoredProducts(imported.products);

    setInvoices(imported.invoices);
    saveStoredInvoices(imported.invoices);

    setShopDetails(imported.shopDetails);
    saveStoredShopDetails(imported.shopDetails);

    setCheckoutInvoice(null);
  };

  // Active Sequential invoice identifier calculation
  const nextInvoiceNumber = generateNextInvoiceNumber(invoices);

  return (
    <div className="flex bg-offwhite min-h-screen text-slate-text antialiased">
      {/* 
        Print Template Layer:
        - Visible ONLY on paper printer spooling (using media queries configured in index.css).
        - Takes up 0px on normal web standard desktop screen preview.
      */}
      <PrintTemplate invoice={printInvoiceSnapshot} shopDetails={shopDetails} />

      {/* 
        Standard Desktop App Section:
        - Hidden via CSS 'print:hidden' when the native print sequence is executed.
      */}
      <div className="flex flex-1 min-w-0 no-print">
        {/* Sidebar Frame */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} shopDetails={shopDetails} />

        {/* Core Main View Frame */}
        <main className="flex-1 min-w-0 px-8 py-6 overflow-y-auto max-w-7xl mx-auto space-y-6">
          {activeTab === 'products' && (
            <ProductManager
              products={products}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onShowNotification={showNotification}
            />
          )}

          {activeTab === 'new_invoice' && (
            checkoutInvoice ? (
              <CheckoutView
                checkoutInvoice={checkoutInvoice}
                nextInvoiceNumber={nextInvoiceNumber}
                shopDetails={shopDetails}
                onConfirmCheckout={handleConfirmCheckout}
                onBackToEdit={handleBackToEdit}
                onShowNotification={showNotification}
                onSetPrintInvoiceSnapshot={setPrintInvoiceSnapshot}
              />
            ) : (
              <InvoiceBuilder
                products={products}
                nextInvoiceNumber={nextInvoiceNumber}
                onProceedToCheckout={handleProceedToCheckout}
                onShowNotification={showNotification}
              />
            )
          )}

          {activeTab === 'history' && (
            <InvoiceHistory
              invoices={invoices}
              shopDetails={shopDetails}
              onDeleteInvoice={handleDeleteInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onSetPrintInvoiceSnapshot={setPrintInvoiceSnapshot}
              onShowNotification={showNotification}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              shopDetails={shopDetails}
              onUpdateShopDetails={handleUpdateShopDetails}
              products={products}
              invoices={invoices}
              onImportBackup={handleImportBackup}
              onShowNotification={showNotification}
            />
          )}
        </main>
      </div>

      {/* Styled toast notifications stack */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
