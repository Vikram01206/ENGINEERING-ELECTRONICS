export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  taxPercent: number; // e.g. 18 for 18%
  category: string;
  inStock?: number; // availability
}

export interface Customer {
  name: string;
  phone: string;
  gst?: string;
  address?: string; // Optional customer address
}

export interface InvoiceItem {
  productId: string;
  sku: string;     // Stored snapshot for safety
  name: string;    // Stored snapshot for safety
  qty: number;
  unitPrice: number;
  tax: number;     // calculated tax amount for this item (qty * unitPrice * taxPercent/100)
  amount: number;  // line total including tax: (qty * unitPrice) + tax
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  discount: number; // Numeric amount
  discountType: 'percentage' | 'fixed'; // Percentage or fixed currency discount
  total: number; // grand total
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Cheque';
  status: 'Paid' | 'Pending';
}

export interface ShopDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  gst?: string;
}
