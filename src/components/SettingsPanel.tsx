import React, { useState, useRef } from 'react';
import { Save, Download, Upload, ShieldCheck, Database, FileText, CheckCircle2 } from 'lucide-react';
import { ShopDetails, Product, Invoice } from '../types';

interface SettingsPanelProps {
  shopDetails: ShopDetails;
  onUpdateShopDetails: (details: ShopDetails) => void;
  products: Product[];
  invoices: Invoice[];
  onImportBackup: (importedData: { products: Product[]; invoices: Invoice[]; shopDetails: ShopDetails }) => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function SettingsPanel({
  shopDetails,
  onUpdateShopDetails,
  products,
  invoices,
  onImportBackup,
  onShowNotification
}: SettingsPanelProps) {
  const [formData, setFormData] = useState<ShopDetails>({ ...shopDetails });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Shop name is required.';
    if (!formData.phone.trim()) newErrors.phone = 'Contact phone number is required.';
    if (!formData.email.trim()) newErrors.email = 'Support Email address is required.';
    if (!formData.address.trim()) newErrors.address = 'Official address cannot be empty.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      onShowNotification('Correct profile field errors.', 'error');
      return;
    }

    setErrors({});
    onUpdateShopDetails(formData);
    onShowNotification('Shop profile details updated successfully.', 'success');
  };

  // Export database to .json file download
  const handleExportBackup = () => {
    try {
      const backupObj = {
        metaName: 'Engineering Enterprise Ledger Export',
        exportedAt: new Date().toISOString(),
        shopDetails,
        products,
        invoices
      };

      const fileContent = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `engineering_enterprise_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowNotification('JSON ledger data backup downloaded successfully', 'success');
    } catch (e) {
      onShowNotification('Failed to generate export file.', 'error');
    }
  };

  // Import backup logic from .json
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // Broad structural validation
        if (!data || !Array.isArray(data.products) || !Array.isArray(data.invoices) || !data.shopDetails) {
          onShowNotification('Invalid backup file schema: properties mismatch.', 'error');
          return;
        }

        // Validate items inside products
        const sampleProduct = data.products[0];
        if (sampleProduct && (!sampleProduct.id || !sampleProduct.sku || !sampleProduct.name || sampleProduct.price === undefined)) {
          onShowNotification('Invalid Backup: Products validation failed.', 'error');
          return;
        }

        // Apply backup changes
        onImportBackup({
          products: data.products,
          invoices: data.invoices,
          shopDetails: data.shopDetails
        });

        // Clear files input selector
        if (fileInputRef.current) fileInputRef.current.value = '';

        onShowNotification('Backup successfully restored. Ledger restarted.', 'success');
      } catch (err) {
        onShowNotification('Failed to parse uploaded JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-800">
          Store Profile & Ledger Security
        </h1>
        <p className="text-sm font-sans text-slate-500 mt-1">
          Customize official tax descriptors, TIN addresses, and manage hard disk file exports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Shop profile */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-soft p-5">
          <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-4">
            <ShieldCheck className="w-4.5 h-4.5 text-crimson" />
            Tax Bill Header Parameters (TIN Details)
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Enterprise Registered Name*
                </label>
                <input
                  id="settings-shop-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all text-sm font-semibold ${
                    errors.name ? 'border-rose-455' : 'border-slate-200 focus:border-crimson'
                  }`}
                />
                {errors.name && <p className="text-crimson text-xs font-medium mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Registered GSTIN Number
                </label>
                <input
                  id="settings-shop-gst"
                  type="text"
                  placeholder="e.g. 33AAFCS4829K1Z4"
                  value={formData.gst || ''}
                  onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-crimson rounded-md focus:outline-none uppercase transition-all text-sm font-semibold text-crimson"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Corporate Phone Mobile / Tel*
                </label>
                <input
                  id="settings-shop-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all text-sm font-mono font-bold ${
                    errors.phone ? 'border-rose-455' : 'border-slate-200 focus:border-crimson'
                  }`}
                />
                {errors.phone && <p className="text-crimson text-xs font-medium mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Official Contact / billing Email*
                </label>
                <input
                  id="settings-shop-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all text-sm font-semibold ${
                    errors.email ? 'border-rose-455' : 'border-slate-200 focus:border-crimson'
                  }`}
                />
                {errors.email && <p className="text-crimson text-xs font-medium mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Physical Shop Invoice Address*
              </label>
              <textarea
                id="settings-shop-address"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none transition-all text-sm font-semibold ${
                  errors.address ? 'border-rose-455' : 'border-slate-200 focus:border-crimson'
                }`}
              />
              {errors.address && <p className="text-crimson text-xs font-medium mt-1">{errors.address}</p>}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                id="settings-save-button"
                type="submit"
                className="bg-crimson hover:bg-red-800 text-white font-semibold py-2 px-5 rounded-lg flex items-center gap-2 transition-all shadow-sm text-xs uppercase"
              >
                <Save className="w-4 h-4" />
                Save Store Profile
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Export/Import Backups */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-soft p-5 space-y-4">
          <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Database className="w-4.5 h-4.5 text-crimson" />
            Ledger Backups & Recovery
          </h3>

          <div className="space-y-4 text-xs font-sans">
            <p className="text-slate-500 leading-relaxed leading-normal">
              Download local ledger databases including customized tax codes, stock counters, customer accounts, and invoice snapshots as 
              a portable JSON file. Restore this backup file at any terminal instantly.
            </p>

            <div className="space-y-2 pt-2">
              <button
                id="settings-export-btn"
                onClick={handleExportBackup}
                className="w-full border border-slate-250 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs uppercase tracking-wide"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Export Local Ledger
              </button>

              <button
                id="settings-import-btn"
                onClick={triggerFileInput}
                className="w-full bg-cream hover:bg-amber-100 text-crimson font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs uppercase tracking-wide border border-rose-200"
              >
                <Upload className="w-4 h-4 text-crimson" />
                Upload Restore JSON
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                Current Ledger metrics
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-150">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase leading-none">Products</div>
                  <div className="text-base font-bold text-slate-800 mt-1">{products.length} cataloged</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-150">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase leading-none">Invoices</div>
                  <div className="text-base font-bold text-slate-800 mt-1">{invoices.length} archived</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
