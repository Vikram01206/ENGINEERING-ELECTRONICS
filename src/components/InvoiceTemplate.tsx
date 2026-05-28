import React, { useState, useEffect } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import html2canvas from 'html2canvas';
import { Printer, Download, Edit2, Check, ArrowLeft, RefreshCw, Plus, Trash2, ChevronDown, FileSpreadsheet, FileImage, FileText } from 'lucide-react';

export interface InvoiceTemplateData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  reference: string;
  paymentDueIn: string;

  customer: {
    name: string;
    address1: string;
    address2: string;
    cityStateZip: string;
    phone: string;
    email: string;
    gst?: string;
  };

  items: Array<{
    sku: string;
    description: string;
    qty: number;
    unitPrice: number;
    taxPercent: number;
    taxAmount: number;
    amount: number;
  }>;

  subtotal: number;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
  };
  shipping: number;
  cgst: number;
  sgst: number;
  total: number;

  paymentMethod: string;
  paymentTerms: string;
}

interface InvoiceTemplateProps {
  initialInvoiceData: InvoiceTemplateData;
  onBack?: () => void;
  onInvoiceUpdate?: (updatedData: InvoiceTemplateData) => void;
}

export default function InvoiceTemplate({ initialInvoiceData, onBack, onInvoiceUpdate }: InvoiceTemplateProps) {
  const [editMode, setEditMode] = useState(false);
  const [currentData, setCurrentData] = useState<InvoiceTemplateData>(initialInvoiceData);
  const [showLogo, setShowLogo] = useState(true);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Auto-recalculate values in local state when items, discount, or shipping changes
  const calculateTotals = (itemsList: InvoiceTemplateData['items'], disc: InvoiceTemplateData['discount'], shipValue: number) => {
    const calculatedSubtotal = itemsList.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    
    // CGST & SGST (9% each as defined in specifications)
    const calculatedCgst = parseFloat((calculatedSubtotal * 0.09).toFixed(2));
    const calculatedSgst = parseFloat((calculatedSubtotal * 0.09).toFixed(2));
    
    // Calculate Discount amount
    let calculatedDiscountAmount = 0;
    if (disc.type === 'percentage') {
      calculatedDiscountAmount = parseFloat(((disc.value / 100) * calculatedSubtotal).toFixed(2));
    } else {
      calculatedDiscountAmount = disc.value;
    }

    const calculatedTotal = parseFloat(
      (calculatedSubtotal + calculatedCgst + calculatedSgst + shipValue - calculatedDiscountAmount).toFixed(2)
    );

    return {
      subtotal: calculatedSubtotal,
      cgst: calculatedCgst,
      sgst: calculatedSgst,
      discount: {
        ...disc,
        amount: calculatedDiscountAmount
      },
      total: Math.max(0, calculatedTotal)
    };
  };

  // Handle high level structure field updates
  const handleFieldChange = (path: string, value: any) => {
    const updated = { ...currentData };
    const keys = path.split('.');
    
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;

    // Trigger recalculations if discount or shipping was modified
    if (path.startsWith('discount') || path === 'shipping') {
      const recalculated = calculateTotals(updated.items, updated.discount, updated.shipping);
      updated.subtotal = recalculated.subtotal;
      updated.cgst = recalculated.cgst;
      updated.sgst = recalculated.sgst;
      updated.discount = recalculated.discount;
      updated.total = recalculated.total;
    }

    setCurrentData(updated);
  };

  // Handle line item cell edits
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...currentData.items];
    const item = { ...updatedItems[index], [field]: value };
    
    // Recalculate line level tax & amount
    const qty = field === 'qty' ? Number(value) : item.qty;
    const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
    
    item.amount = parseFloat((qty * price).toFixed(2));
    // Line tax snapshot as requested
    item.taxAmount = parseFloat((qty * price * (item.taxPercent / 100)).toFixed(2));

    updatedItems[index] = item;

    const recalculated = calculateTotals(updatedItems, currentData.discount, currentData.shipping);

    setCurrentData({
      ...currentData,
      items: updatedItems,
      subtotal: recalculated.subtotal,
      cgst: recalculated.cgst,
      sgst: recalculated.sgst,
      discount: recalculated.discount,
      total: recalculated.total
    });
  };

  // Handle add line item
  const handleAddItem = () => {
    const newItem = {
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      description: 'New Product Item Description',
      qty: 1,
      unitPrice: 100,
      taxPercent: 18,
      taxAmount: 18,
      amount: 100
    };
    const updatedItems = [...currentData.items, newItem];
    const recalculated = calculateTotals(updatedItems, currentData.discount, currentData.shipping);

    setCurrentData({
      ...currentData,
      items: updatedItems,
      subtotal: recalculated.subtotal,
      cgst: recalculated.cgst,
      sgst: recalculated.sgst,
      discount: recalculated.discount,
      total: recalculated.total
    });
  };

  // Handle remove line item
  const handleRemoveItem = (index: number) => {
    if (currentData.items.length <= 1) return;
    const updatedItems = currentData.items.filter((_, idx) => idx !== index);
    const recalculated = calculateTotals(updatedItems, currentData.discount, currentData.shipping);

    setCurrentData({
      ...currentData,
      items: updatedItems,
      subtotal: recalculated.subtotal,
      cgst: recalculated.cgst,
      sgst: recalculated.sgst,
      discount: recalculated.discount,
      total: recalculated.total
    });
  };

  // Native Printer dialogue
  const handlePrint = () => {
    window.print();
  };

  // Helper to parse oklch and oklab color strings and convert to standard rgb() format for html2canvas compatibility
  const parseModernColorsAndConvert = (val: string): string => {
    if (!val) return val;
    let result = val;

    const convertColorContentToRgb = (type: string, content: string): string => {
      try {
        const parts = content.split('/');
        const colorPart = parts[0].trim();
        const alphaPart = parts[1] ? parts[1].trim() : null;

        const coords = colorPart.split(/[\s,]+/).filter(Boolean);
        if (coords.length < 3) return 'rgb(120, 120, 120)';

        // If coordinates or content contain CSS variables, fallback to a safe static color
        if (content.includes('var(')) {
          if (content.includes('blue') || content.includes('primary')) return 'rgb(29, 78, 216)';
          if (content.includes('red') || content.includes('rose') || content.includes('error')) return 'rgb(225, 29, 72)';
          if (content.includes('slate') || content.includes('gray')) return 'rgb(100, 116, 139)';
          return 'rgb(100, 116, 139)';
        }

        const lStr = coords[0];
        const val1Str = coords[1];
        const val2Str = coords[2];

        let l = 0;
        if (lStr.endsWith('%')) {
          l = parseFloat(lStr) / 100;
        } else {
          l = parseFloat(lStr);
        }

        let a = 0;
        let b = 0;

        if (type.toLowerCase() === 'oklch') {
          let c = 0;
          if (val1Str.endsWith('%')) {
            c = (parseFloat(val1Str) / 100) * 0.4;
          } else {
            c = parseFloat(val1Str);
          }

          let h = 0;
          if (val2Str.endsWith('deg')) {
            h = parseFloat(val2Str);
          } else if (val2Str.endsWith('rad')) {
            h = parseFloat(val2Str) * (180 / Math.PI);
          } else if (val2Str.endsWith('turn')) {
            h = parseFloat(val2Str) * 360;
          } else {
            h = parseFloat(val2Str);
          }

          a = c * Math.cos(h * Math.PI / 180);
          b = c * Math.sin(h * Math.PI / 180);
        } else {
          // oklab
          if (val1Str.endsWith('%')) {
            a = (parseFloat(val1Str) / 100) * 0.4;
          } else {
            a = parseFloat(val1Str);
          }

          if (val2Str.endsWith('%')) {
            b = (parseFloat(val2Str) / 100) * 0.4;
          } else {
            b = parseFloat(val2Str);
          }
        }

        // Parse Alpha
        let alphaVal = 1;
        if (alphaPart) {
          if (alphaPart.endsWith('%')) {
            alphaVal = parseFloat(alphaPart) / 100;
          } else if (alphaPart.includes('var(')) {
            alphaVal = 1;
          } else {
            alphaVal = parseFloat(alphaPart);
          }
        } else if (coords[3]) {
          const aStr = coords[3];
          if (aStr.endsWith('%')) {
            alphaVal = parseFloat(aStr) / 100;
          } else if (!aStr.includes('var(')) {
            alphaVal = parseFloat(aStr);
          }
        }

        if (isNaN(alphaVal)) alphaVal = 1;

        // Convert OKLab to LMS
        const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
        const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
        const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
        
        const l_3 = l_ * l_ * l_;
        const m_3 = m_ * m_ * m_;
        const s_3 = s_ * s_ * s_;
        
        // Convert LMS to sRGB
        const r = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
        const g = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
        const b_ = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;
        
        const compress = (x: number) => {
          return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        };
        
        const r_compressed = Math.round(Math.max(0, Math.min(1, compress(r))) * 255);
        const g_compressed = Math.round(Math.max(0, Math.min(1, compress(g))) * 255);
        const b_compressed = Math.round(Math.max(0, Math.min(1, compress(b_))) * 255);

        if (isNaN(r_compressed) || isNaN(g_compressed) || isNaN(b_compressed)) {
          return 'rgb(100, 116, 139)';
        }
        
        return `rgba(${r_compressed}, ${g_compressed}, ${b_compressed}, ${alphaVal})`;
      } catch {
        return 'rgb(120, 120, 120)';
      }
    };

    while (true) {
      // Find case-insensitive match for oklch( or oklab(
      const match = result.match(/(oklch|oklab)\(/i);
      if (!match) break;

      const startIndex = match.index!;
      const type = match[1].toLowerCase();

      // Find closing parenthesis using character matching/balanced parenthetic parsing
      let parenCount = 1;
      let endIndex = -1;
      const searchStart = startIndex + type.length + 1;

      for (let i = searchStart; i < result.length; i++) {
        if (result[i] === '(') {
          parenCount++;
        } else if (result[i] === ')') {
          parenCount--;
          if (parenCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex === -1) {
        // Unbalanced parentheses - we must remove/bypass that specific function prefix to prevent html2canvas crash
        const nextCharIndex = startIndex + type.length;
        result = result.substring(0, startIndex) + "rgb(120, 120, 120" + result.substring(nextCharIndex);
        continue;
      }

      const content = result.substring(searchStart, endIndex);
      const convertedColor = convertColorContentToRgb(type, content);

      // Re-stitch together, replacing the matched block
      result = result.substring(0, startIndex) + convertedColor + result.substring(endIndex + 1);
    }

    return result;
  };

  // A robust downloader that bypasses Nativefier sandbox issues and resolves dynamically
  const triggerSafeDownload = (blobOrDataUri: Blob | string, filename: string, mimeType: string) => {
    console.log(`[DOWNLOAD ENGINE] Attempting to save: ${filename} (MimeType: ${mimeType})`);
    
    // Safety check for empty content
    if (!blobOrDataUri) {
      console.error("[DOWNLOAD ENGINE ERROR] File content payload is empty.");
      alert("Download failed: File content generated was empty.");
      return;
    }

    try {
      if (blobOrDataUri instanceof Blob) {
        // Standard Web approach with local Object URL
        const url = URL.createObjectURL(blobOrDataUri);
        console.log(`[DOWNLOAD SYSTEM] ObjectURL successfully allocated: ${url}`);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Dispatched element click action
        try {
          link.click();
          console.log(`[DOWNLOAD SYSTEM] Anchor click dispatched successfully for ${filename}`);
        } catch (clickErr) {
          console.warn("[DOWNLOAD SYSTEM] Programmatic click failed, using MouseEvent dispatch fallback:", clickErr);
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          link.dispatchEvent(clickEvent);
        }
        
        document.body.removeChild(link);
        
        // Revoke after a delay to ensure the browser frame thread has successfully received the download stream
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log(`[DOWNLOAD SYSTEM] ObjectURL revoked/deallocated: ${url}`);
        }, 12000);
        
      } else if (typeof blobOrDataUri === 'string' && blobOrDataUri.startsWith('data:')) {
        // Base64 Data-URI payload
        console.log(`[DOWNLOAD SYSTEM] Data-URI detected (payload length: ${blobOrDataUri.length} characters).`);
        const link = document.createElement('a');
        link.href = blobOrDataUri;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        try {
          link.click();
          console.log(`[DOWNLOAD SYSTEM] Data-URI click dispatched successfully for ${filename}`);
        } catch (clickErr) {
          console.warn("[DOWNLOAD SYSTEM] Data-URI programmatic click failed, dispatching MouseEvent fallback:", clickErr);
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          link.dispatchEvent(clickEvent);
        }
        document.body.removeChild(link);
      } else {
        // Fallback for direct URL strings
        const link = document.createElement('a');
        link.href = blobOrDataUri;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error("[DOWNLOAD ENGINE CRITICAL ERROR] Standard sandbox file-save routine failed:", err);
      
      // Fallback 1: PDF printable fallback alert
      if (filename.toLowerCase().endsWith('.pdf')) {
        alert(
          `NOTICE: Environment File System Sandbox Detected!\n\n` +
          `Your packaged client (Nativefier/Electron) has restricted direct file-write operations.\n\n` +
          `FIX: Click "Print Invoice" on the toolbar and select "Save as PDF" relative to your local printer dialog to save custom drafts perfectly!`
        );
      } else if (filename.toLowerCase().endsWith('.csv') || filename.toLowerCase().endsWith('.xls')) {
        // Clipboard fallback for Spreadsheet operations
        try {
          if (blobOrDataUri instanceof Blob) {
            blobOrDataUri.text().then(text => {
              navigator.clipboard.writeText(text);
              alert("Sandbox restricted direct file save. The Excel Ledger CSV rows have been successfully copied to your system clipboard instead! Paste in Microsoft Excel or Google Sheets directly via Ctrl+V.");
            });
          } else if (typeof blobOrDataUri === 'string') {
            navigator.clipboard.writeText(blobOrDataUri);
            alert("Sandbox restricted direct file save. The Excel Ledger CSV rows have been successfully copied to your system clipboard instead! Paste in Microsoft Excel or Google Sheets directly via Ctrl+V.");
          }
        } catch (clipErr) {
          console.error("Clipboard backup fallback failed:", clipErr);
          alert(`Download blocked by environment sandbox. Error: ${err.message || err}`);
        }
      } else {
        alert(`File save is restricted by your local native client sandbox. Error: ${err.message || err}`);
      }
    }
  };

  // Helper to compile Invoice Data into Excel CSV representation
  const generateInvoiceCSV = (data: InvoiceTemplateData): string => {
    const rows = [
      ['--- INVOICE LEDGER TRANSACTION ---'],
      ['Invoice Number', data.invoiceNumber],
      ['Invoice Date', data.invoiceDate],
      ['Due Date', data.dueDate],
      ['P.O. Number', data.poNumber || 'N/A'],
      ['Reference', data.reference || 'N/A'],
      ['Payment Method', data.paymentMethod],
      ['Payment Terms', data.paymentTerms],
      [],
      ['--- CUSTOMER DETAIL ---'],
      ['Name', data.customer.name],
      ['Address Line 1', data.customer.address1],
      ['Address Line 2', data.customer.address2 || ''],
      ['City, State, Zip', data.customer.cityStateZip],
      ['Phone', data.customer.phone || 'N/A'],
      ['Email', data.customer.email || 'N/A'],
      ['GSTIN', data.customer.gst || 'N/A'],
      [],
      ['--- INLINE EXPENSES (SKUs) ---'],
      ['SKU Code', 'Description', 'Qty', 'Unit Price', 'Tax %', 'Tax Amount', 'Total Amount']
    ];

    data.items.forEach(item => {
      rows.push([
        item.sku,
        item.description,
        item.qty.toString(),
        item.unitPrice.toString(),
        item.taxPercent.toString(),
        item.taxAmount.toFixed(2),
        item.amount.toFixed(2)
      ]);
    });

    rows.push([]);
    rows.push(['--- LEDGER TOTALS ---']);
    rows.push(['Subtotal', data.subtotal.toFixed(2)]);
    rows.push(['Discount Value', `${data.discount.value} (${data.discount.type})`]);
    rows.push(['Discount Amount', data.discount.amount.toFixed(2)]);
    rows.push(['Shipping Details', data.shipping.toFixed(2)]);
    rows.push(['CGST (9%)', data.cgst.toFixed(2)]);
    rows.push(['SGST (9%)', data.sgst.toFixed(2)]);
    rows.push(['GRAND TOTAL (INR)', data.total.toFixed(2)]);

    return rows.map(row => 
      row.map(val => {
        const stringified = val ? val.replace(/"/g, '""') : '';
        return (stringified.includes(',') || stringified.includes('\n') || stringified.includes('"'))
          ? `"${stringified}"`
          : stringified;
      }).join(',')
    ).join('\n');
  };

  // PDF Download Trigger
  const handleDownloadPDF = () => {
    const element = document.getElementById('invoice-print-content');
    if (!element) return;
    const opt = {
      margin: 0,
      filename: `${currentData.invoiceNumber || 'INV-001'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
            try {
              const sheet = (linkEl as HTMLLinkElement).sheet;
              if (sheet) {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  let cssText = '';
                  for (let i = 0; i < rules.length; i++) {
                    try {
                      cssText += rules[i].cssText + '\n';
                    } catch (_) {}
                  }
                  const cleaned = parseModernColorsAndConvert(cssText);
                  const styleEl = clonedDoc.createElement('style');
                  styleEl.textContent = cleaned;
                  if (linkEl.parentNode) {
                    linkEl.parentNode.replaceChild(styleEl, linkEl);
                  }
                }
              }
            } catch (e) {
              console.warn("Could not inline stylesheet inside print instance:", e);
            }
          });

          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            if (styleEl.textContent && (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab'))) {
              styleEl.textContent = parseModernColorsAndConvert(styleEl.textContent);
            }
          });

          clonedDoc.querySelectorAll('[style]').forEach((el) => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
              el.setAttribute('style', parseModernColorsAndConvert(styleAttr));
            }
          });

          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            const originalGetComputedStyle = clonedWindow.getComputedStyle;
            clonedWindow.getComputedStyle = function(elt, pseudoElt) {
              const style = originalGetComputedStyle.call(clonedWindow, elt, pseudoElt);
              const copy: any = {
                getPropertyValue: (name: string) => {
                  const val = style.getPropertyValue(name);
                  if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                    return parseModernColorsAndConvert(val);
                  }
                  return val;
                }
              };
              
              copy.length = style.length;
              copy.item = (index: number) => style.item(index);
              
              for (let i = 0; i < style.length; i++) {
                const name = style[i];
                const val = style.getPropertyValue(name);
                copy[name] = (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab')))
                  ? parseModernColorsAndConvert(val)
                  : val;
              }
              
              for (const key in style) {
                try {
                  if (typeof (style as any)[key] === 'string' && !copy[key]) {
                    const val = (style as any)[key];
                    copy[key] = (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab')))
                      ? parseModernColorsAndConvert(val)
                      : val;
                  }
                } catch (_) {}
              }
              return copy;
            };
          }
        }
      },
      jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' as const }
    };

    console.log("[PDF GENERATOR] Starting PDF render sequence...");
    try {
      const worker = html2pdf().set(opt).from(element);
      
      // Nativefier/Electron security disallows dynamic window location object-url triggers.
      // Generating a base64 Data URI from the PDF output gives Electron a standard protocol it can route cleanly to standard save paths.
      worker.output('datauristring').then((dataUri: string) => {
        const filename = `${currentData.invoiceNumber || 'INV-001'}.pdf`;
        triggerSafeDownload(dataUri, filename, 'application/pdf');
      }).catch((err: any) => {
        console.error("[PDF PROCESSOR ERROR] Base64 rendering failed, calling standard save():", err);
        html2pdf().set(opt).from(element).save();
      });
    } catch (err: any) {
      console.error("[PDF PREPARATION CRITICAL FAIL]:", err);
      alert('PDF compiler crashed. Please use the "Print Invoice" option as an alternative workaround!');
    }
  };

  // Excel (.csv) Download Trigger
  const handleDownloadExcel = () => {
    console.log("[EXCEL ENGINE] Extracting database metadata for ledger compilations...");
    try {
      const csvStr = generateInvoiceCSV(currentData);
      const BOM = "\uFEFF"; // UTF-8 BOM to ensure MS Excel parses Asian or specialized symbols cleanly
      const blob = new Blob([BOM + csvStr], { type: 'text/csv;charset=utf-8' });
      const filename = `Invoice_${currentData.invoiceNumber || 'INV-001'}_Ledger.csv`;
      
      triggerSafeDownload(blob, filename, 'text/csv');
    } catch (err: any) {
      console.error("[EXCEL DOWNLOAD EXCEPTION]:", err);
      alert(`CSV compile failed: ${err.message || err}`);
    }
  };

  // Image (.png) Download Trigger
  const handleDownloadImage = () => {
    const element = document.getElementById('invoice-print-content');
    if (!element) return;

    const opt = {
      scale: 2, // High resolution scale
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      onclone: (clonedDoc: Document) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
          try {
            const sheet = (linkEl as HTMLLinkElement).sheet;
            if (sheet) {
              const rules = sheet.cssRules || sheet.rules;
              if (rules) {
                let cssText = '';
                for (let i = 0; i < rules.length; i++) {
                  try {
                    cssText += rules[i].cssText + '\n';
                  } catch (_) {}
                }
                const cleaned = parseModernColorsAndConvert(cssText);
                const styleEl = clonedDoc.createElement('style');
                styleEl.textContent = cleaned;
                if (linkEl.parentNode) {
                  linkEl.parentNode.replaceChild(styleEl, linkEl);
                }
              }
            }
          } catch (e) {
            console.warn("Could not inline styling inside canvas context:", e);
          }
        });

        clonedDoc.querySelectorAll('style').forEach((styleEl) => {
          if (styleEl.textContent && (styleEl.textContent.includes('oklch') || styleEl.textContent.includes('oklab'))) {
            styleEl.textContent = parseModernColorsAndConvert(styleEl.textContent);
          }
        });

        clonedDoc.querySelectorAll('[style]').forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
            el.setAttribute('style', parseModernColorsAndConvert(styleAttr));
          }
        });
      }
    };

    console.log("[IMAGE ENGINE] Rendering A4 sheet into HTML5 Canvas element...");
    try {
      html2canvas(element, opt).then((canvas: HTMLCanvasElement) => {
        console.log("[IMAGE PC] Canvas initialized successfully. Grabbing PNG DataURL stream...");
        const dataUri = canvas.toDataURL('image/png');
        const filename = `Invoice_${currentData.invoiceNumber || 'INV-001'}.png`;
        triggerSafeDownload(dataUri, filename, 'image/png');
      }).catch((err: any) => {
        console.error("[IMAGE COMPILER FAIL]:", err);
        alert('Image generation failed. Please try "Download PDF" instead.');
      });
    } catch (err: any) {
      console.error("[IMAGE COMPILER TRIGGER FAIL]:", err);
      alert(`Image subsystem error: ${err.message || err}`);
    }
  };

  const handleDoneEditing = () => {
    setEditMode(false);
    if (onInvoiceUpdate) {
      onInvoiceUpdate(currentData);
    }
  };

  return (
    <div id="invoice-feature-root" className="w-full flex-1 flex flex-col min-h-0 space-y-6">
      {/* Top Header Controls bar */}
      <div className="no-print bg-white p-4 border border-slate-200 rounded-xl shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-black rounded-lg transition-all border border-slate-200"
              title="Return to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-black text-base font-bold font-serif leading-none">
              Invoice Ledger Console
            </h2>
            <p className="text-[10px] text-black font-semibold mt-1.5 uppercase tracking-wider font-sans">
              Preview-driven editing, high-resolution printing & PDF export
            </p>
          </div>
        </div>

        {/* Buttons Action hub */}
        <div className="flex items-center gap-3">
          {editMode ? (
            <button
              onClick={handleDoneEditing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Done Editing
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-[#B40023] hover:bg-[#90001C] text-white rounded-lg font-bold text-xs shadow-md flex items-center transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit Invoice
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs border border-slate-600 shadow-md flex items-center transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Invoice
          </button>

          {/* Multi-Format Download Action hub */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download Document
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>
            {showDownloadDropdown && (
              <>
                {/* Backdrop overlay to safely capture clicks outside and dismiss */}
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setShowDownloadDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-[101] animate-in fade-in duration-100 block">
                  <button
                    onClick={() => {
                      handleDownloadPDF();
                      setShowDownloadDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 border-b border-slate-100 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    PDF Document (.pdf)
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadExcel();
                      setShowDownloadDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 border-b border-slate-100 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Excel Ledger (.csv)
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadImage();
                      setShowDownloadDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FileImage className="w-3.5 h-3.5 text-indigo-500" />
                    High-Res Image (.png)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editing Warning banner if in editing mode */}
      {editMode && (
        <div className="no-print bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span className="font-medium">Inline Draft Modification active. Modify details directly on the WYSIWYG A4 template below. Recalculations occur automatically.</span>
          </div>
          <div className="flex items-center space-x-3">
            {!showLogo && (
              <button
                onClick={() => setShowLogo(true)}
                className="text-[11px] font-bold text-blue-600 hover:underline mr-4"
              >
                Restore Logo
              </button>
            )}
            <button 
              onClick={handleDoneEditing}
              className="text-[11px] font-bold text-[#B40023] hover:underline whitespace-nowrap"
            >
              Complete Modifications
            </button>
          </div>
        </div>
      )}

      {/* The Printable A4 Sheet container wrapper */}
      <div className="flex justify-center items-start overflow-auto p-4 bg-slate-900/10 rounded-xl border border-slate-200/50 min-h-[700px]">
        
        {/* Actual Printed Content matching exact mockup */}
        <div
          id="invoice-print-content"
          className="bg-white w-[210mm] min-h-[297mm] p-10 font-sans text-[#1F2937] relative shadow-2xl rounded-sm box-border flex flex-col justify-between"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          {/* Subtle logo/text watermark for elite brand texture */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
            <h1 className="font-serif text-[120px] font-extrabold tracking-widest uppercase">ENGINEERING</h1>
          </div>

          <div>
            {/* Top Layout Header Block */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6 relative">
              {/* Brand Profile left with stylish symbol */}
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-[20px] font-bold tracking-tight text-blue-700 font-serif leading-tight">
                    ENGINEERING ENTERPRISE
                  </h1>
                  <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                    TIN: 33223824729 | GST: 33BUIPM9249J1Z4
                  </p>
                </div>
              </div>

              {/* Blue accent tab with slanted layout */}
              <div className="text-right">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white font-serif font-extrabold text-[24px] uppercase tracking-wider px-6 py-2 rounded-l-lg shadow-sm -mr-10 transform skew-x-3 inline-block">
                  INVOICE
                </div>
              </div>
            </div>

            {/* Recipient Profile vs Store Contact details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Customer Column */}
              <div className="bg-slate-50/70 p-4 border border-slate-200/50 rounded-lg">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-3 font-sans">
                  BILL TO:
                </h4>
                
                {editMode ? (
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Client Name</label>
                      <input
                        type="text"
                        value={currentData.customer.name}
                        onChange={(e) => handleFieldChange('customer.name', e.target.value)}
                        className="w-full text-xs font-semibold p-1.5 border border-blue-500 rounded bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Address Line 1</label>
                      <input
                        type="text"
                        value={currentData.customer.address1}
                        onChange={(e) => handleFieldChange('customer.address1', e.target.value)}
                        className="w-full text-xs p-1.5 border border-blue-400 rounded bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Address Line 2</label>
                      <input
                        type="text"
                        value={currentData.customer.address2}
                        onChange={(e) => handleFieldChange('customer.address2', e.target.value)}
                        className="w-full text-xs p-1.5 border border-blue-400 rounded bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block uppercase leading-none">City, State, Zip Code</label>
                      <input
                        type="text"
                        value={currentData.customer.cityStateZip}
                        onChange={(e) => handleFieldChange('customer.cityStateZip', e.target.value)}
                        className="w-full text-xs p-1.5 border border-blue-400 rounded bg-white text-slate-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-800 font-sans">
                    <p className="text-[14px] font-bold text-slate-900">{currentData.customer.name}</p>
                    <p className="text-[12px]">{currentData.customer.address1}</p>
                    <p className="text-[12px]">{currentData.customer.address2}</p>
                    <p className="text-[12px] font-medium text-slate-600">{currentData.customer.cityStateZip}</p>
                    {currentData.customer.gst && (
                      <p className="text-[11px] font-mono mt-1 text-blue-700 font-bold">Client GST: {currentData.customer.gst}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Store contact Address details (fixed right) */}
              <div className="text-right space-y-2 text-[12px] text-slate-600 pr-2">
                <div className="flex justify-end items-start space-x-2">
                  <span className="font-semibold text-slate-800 text-right">
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

            {/* Structured Metadata block container of Invoice Specs */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-y-3 gap-x-6 text-[12px] mb-8 font-sans">
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">Invoice No.</span>
                  {editMode ? (
                    <input
                      type="text"
                      value={currentData.invoiceNumber}
                      onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                      className="text-xs p-1 border border-blue-400 rounded w-28 text-right bg-white font-mono"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-800">{currentData.invoiceNumber}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">PO Number</span>
                  {editMode ? (
                    <input
                      type="text"
                      value={currentData.poNumber}
                      onChange={(e) => handleFieldChange('poNumber', e.target.value)}
                      className="text-xs p-1 border border-blue-400 rounded w-28 text-right bg-white"
                    />
                  ) : (
                    <span className="font-medium">{currentData.poNumber || 'N/A'}</span>
                  )}
                </div>

                <div className="flex justify-between items-center pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">Reference</span>
                  {editMode ? (
                    <input
                      type="text"
                      value={currentData.reference}
                      onChange={(e) => handleFieldChange('reference', e.target.value)}
                      className="text-xs p-1 border border-blue-400 rounded w-28 text-right bg-white"
                    />
                  ) : (
                    <span className="font-medium">{currentData.reference || 'N/A'}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">Invoice Date</span>
                  {editMode ? (
                    <input
                      type="date"
                      value={currentData.invoiceDate}
                      onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                      className="text-xs p-0.5 border border-blue-400 rounded w-28 text-right bg-white font-mono"
                    />
                  ) : (
                    <span className="font-mono">{currentData.invoiceDate}</span>
                  )}
                </div>

                <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">Payment Due By</span>
                  {editMode ? (
                    <input
                      type="date"
                      value={currentData.dueDate}
                      onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                      className="text-xs p-0.5 border border-blue-400 rounded w-28 text-right bg-white font-mono"
                    />
                  ) : (
                    <span className="font-mono">{currentData.dueDate}</span>
                  )}
                </div>

                <div className="flex justify-between items-center pb-1">
                  <span className="text-slate-450 font-bold uppercase text-[10px]">Payment Due In</span>
                  {editMode ? (
                    <input
                      type="text"
                      value={currentData.paymentDueIn}
                      onChange={(e) => handleFieldChange('paymentDueIn', e.target.value)}
                      className="text-xs p-1 border border-blue-400 rounded w-28 text-right bg-white"
                    />
                  ) : (
                    <span className="font-medium">{currentData.paymentDueIn || '30 Days'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Particulars Line Items list table */}
            <div className="mb-6">
              <table className="w-full border-collapse text-[12px] text-slate-800">
                <thead>
                  <tr className="bg-blue-600 text-white font-semibold">
                    <th className="px-4 py-3 text-left uppercase tracking-wider w-[45%]">Description</th>
                    <th className="px-4 py-3 text-center uppercase tracking-wider w-[12%]">Quantity</th>
                    <th className="px-4 py-3 text-right uppercase tracking-wider w-[20%]">Unit Price</th>
                    <th className="px-4 py-3 text-right uppercase tracking-wider w-[23%]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-slate-300">
                  {currentData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        {editMode ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full text-xs font-semibold p-1 border border-blue-400 rounded bg-white text-slate-800"
                            />
                            <div className="flex items-center space-x-2 text-[10px]">
                              <span className="text-slate-400">SKU:</span>
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
                                className="p-0.5 border border-slate-300 rounded text-slate-600"
                              />
                              <span className="text-slate-400">Tax %:</span>
                              <input
                                type="number"
                                value={item.taxPercent}
                                onChange={(e) => handleItemChange(index, 'taxPercent', Number(e.target.value))}
                                className="w-10 p-0.5 border border-slate-300 rounded text-slate-600 text-center"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-800 text-[12px]">{item.description}</p>
                            <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} | Tax {item.taxPercent}%</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {editMode ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                              className="w-12 text-center p-1 border border-blue-400 rounded bg-white font-mono"
                            />
                            <button
                              onClick={() => handleRemoveItem(index)}
                              disabled={currentData.items.length <= 1}
                              className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span>{item.qty}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {editMode ? (
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                            className="w-20 text-center p-1 border border-blue-400 rounded bg-white text-right font-mono"
                          />
                        ) : (
                          <span>₹{item.unitPrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {editMode && (
                <button
                  onClick={handleAddItem}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center bg-blue-50 hover:bg-blue-100/60 p-2 rounded transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  ADD LINE ITEM
                </button>
              )}
            </div>

            {/* Calculations summaries panel align on right */}
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center text-[12px] text-slate-600 font-sans">
                  <span>SUBTOTAL</span>
                  <span className="font-mono font-semibold text-slate-800">₹{currentData.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[12px] text-slate-600 font-sans">
                  <span>CGST (9%)</span>
                  <span className="font-mono text-slate-705">+ ₹{currentData.cgst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-[12px] text-slate-600 font-sans">
                  <span>SGST (9%)</span>
                  <span className="font-mono text-slate-705">+ ₹{currentData.sgst.toFixed(2)}</span>
                </div>

                {editMode ? (
                  <div className="space-y-1 bg-blue-50/50 p-2 rounded">
                    <div className="flex justify-between items-center text-[12px]">
                      <span>Discount Type</span>
                      <select
                        value={currentData.discount.type}
                        onChange={(e) => handleFieldChange('discount.type', e.target.value)}
                        className="text-xs p-1 border border-indigo-400 bg-white rounded"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Flat (₹)</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span>Discount Value</span>
                      <input
                        type="number"
                        min="0"
                        value={currentData.discount.value}
                        onChange={(e) => handleFieldChange('discount.value', parseFloat(e.target.value) || 0)}
                        className="text-xs p-1 border border-indigo-400 w-24 text-right bg-white font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  currentData.discount.amount > 0 && (
                    <div className="flex justify-between items-center text-[12px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                      <span>DISCOUNT ({currentData.discount.type === 'percentage' ? `${currentData.discount.value}%` : 'Flat'})</span>
                      <span className="font-mono font-bold">- ₹{currentData.discount.amount.toFixed(2)}</span>
                    </div>
                  )
                )}

                <div className="flex justify-between items-center text-[12px] text-slate-600 font-sans">
                  <span>SHIPPING & HANDLING</span>
                  {editMode ? (
                    <input
                      type="number"
                      min="0"
                      value={currentData.shipping}
                      onChange={(e) => handleFieldChange('shipping', parseFloat(e.target.value) || 0)}
                      className="text-xs p-1 border border-blue-400 w-24 text-right bg-white font-mono"
                    />
                  ) : (
                    <span className="font-mono">₹{currentData.shipping.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex justify-between items-center bg-blue-50 text-[14px] font-bold text-blue-700 border-t border-b border-blue-200 py-2.5 px-3 rounded-lg">
                  <span className="font-serif">TOTAL DUE</span>
                  <span className="font-mono text-[16px]">₹{currentData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment rules & account details text blocks */}
            <div className="grid grid-cols-2 gap-8 text-[12px] pt-4 border-t border-slate-100">
              <div>
                <div className="flex items-center space-x-1 border-b border-slate-200 pb-1 mb-2">
                  <strong className="text-blue-700 uppercase tracking-wider font-sans">Payment terms:</strong>
                  {editMode ? (
                    <input
                      type="text"
                      value={currentData.paymentTerms}
                      onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                      className="text-xs p-1 border border-blue-400 rounded bg-white text-slate-800 flex-1 ml-2"
                    />
                  ) : (
                    <span className="text-slate-800">{currentData.paymentTerms}</span>
                  )}
                </div>

                <div className="space-y-1.5 mt-3 text-slate-600 text-[11px] font-sans">
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

              {/* Signatures placeholder details */}
              <div className="flex flex-col justify-end items-end pr-4">
                <div className="text-center w-64">
                  <p className="text-slate-400 border-b border-dashed border-slate-300 pb-16 font-mono">
                    {/* Generous spacer representing signature spacing */}
                  </p>
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-widest mt-2">
                    Authorized Signatory
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ENGINEERING ENTERPRISE
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Slogan thank you note */}
          <div className="mt-8 pt-4 border-t-2 border-blue-100 flex items-center justify-center text-center font-serif italic text-blue-800 text-[14px]">
            <span>Thank you for your business!</span>
          </div>
        </div>

      </div>
    </div>
  );
}
