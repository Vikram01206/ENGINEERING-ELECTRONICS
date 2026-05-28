import { Product, Invoice, ShopDetails } from './types';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'LED-005W',
    name: 'LED Bulb 5W',
    price: 150,
    taxPercent: 0,
    category: 'Lighting',
    inStock: 120
  },
  {
    id: 'prod-2',
    sku: 'SM-SW-01',
    name: 'Smart Switch',
    price: 450,
    taxPercent: 18,
    category: 'Switches',
    inStock: 85
  },
  {
    id: 'prod-3',
    sku: 'WR-50M',
    name: 'Wire Roll (50m)',
    price: 280,
    taxPercent: 0,
    category: 'Cables',
    inStock: 40
  },
  {
    id: 'prod-4',
    sku: 'PM-D100',
    name: 'Panel Meter',
    price: 320,
    taxPercent: 18,
    category: 'Meters',
    inStock: 15
  }
];

export const DEFAULT_SHOP_DETAILS: ShopDetails = {
  name: 'ENGINEERING ENTERPRISES',
  phone: '6382952946',
  email: 'ernamdtudu@gmail.com',
  address: 'College P.O., Taradepalli - 631 005',
  gst: '33AAFCS4829K1Z4'
};

// Generates typical default invoices for immediate scanability and print-testing
export const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-1001',
    date: '2026-05-20',
    time: '14:30',
    customer: {
      name: 'Ramanathan Swamy',
      phone: '9840123456',
      gst: '33ABCDE1234F1Z1',
      address: '12, College Street, Taradepalli'
    },
    items: [
      {
        productId: 'prod-2',
        sku: 'SM-SW-01',
        name: 'Smart Switch',
        qty: 3,
        unitPrice: 450,
        tax: 243, // 3 * 450 * 0.18
        amount: 1593 // (3 * 450) + 243
      },
      {
        productId: 'prod-4',
        sku: 'PM-D100',
        name: 'Panel Meter',
        qty: 1,
        unitPrice: 320,
        tax: 57.6, // 1 * 320 * 0.18
        amount: 377.6 // 320 + 57.6
      }
    ],
    subtotal: 1670,
    totalTax: 300.6,
    discount: 50,
    discountType: 'fixed',
    total: 1920.6,
    paymentMethod: 'UPI',
    status: 'Paid'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-1002',
    date: '2026-05-22',
    time: '11:15',
    customer: {
      name: 'Venkatesh Kumar',
      phone: '9176098765',
      address: 'Hostel Block 3, College Campus'
    },
    items: [
      {
        productId: 'prod-1',
        sku: 'LED-005W',
        name: 'LED Bulb 5W',
        qty: 10,
        unitPrice: 150,
        tax: 0,
        amount: 1500
      },
      {
        productId: 'prod-3',
        sku: 'WR-50M',
        name: 'Wire Roll (50m)',
        qty: 1,
        unitPrice: 280,
        tax: 0,
        amount: 280
      }
    ],
    subtotal: 1780,
    totalTax: 0,
    discount: 10, // 10%
    discountType: 'percentage',
    total: 1602, // 1780 * 0.9
    paymentMethod: 'Cash',
    status: 'Paid'
  }
];

export function getStoredProducts(): Product[] {
  const data = localStorage.getItem('sridhar_products');
  if (!data) {
    localStorage.setItem('sridhar_products', JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  localStorage.setItem('sridhar_products', JSON.stringify(products));
}

export function getStoredInvoices(): Invoice[] {
  const data = localStorage.getItem('sridhar_invoices');
  if (!data) {
    localStorage.setItem('sridhar_invoices', JSON.stringify(DEFAULT_INVOICES));
    return DEFAULT_INVOICES;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_INVOICES;
  }
}

export function saveStoredInvoices(invoices: Invoice[]): void {
  localStorage.setItem('sridhar_invoices', JSON.stringify(invoices));
}

export function getStoredShopDetails(): ShopDetails {
  const data = localStorage.getItem('sridhar_shop');
  if (!data) {
    localStorage.setItem('sridhar_shop', JSON.stringify(DEFAULT_SHOP_DETAILS));
    return DEFAULT_SHOP_DETAILS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_SHOP_DETAILS;
  }
}

export function saveStoredShopDetails(shop: ShopDetails): void {
  localStorage.setItem('sridhar_shop', JSON.stringify(shop));
}

// Generate next invoice sequential number
export function generateNextInvoiceNumber(invoices: Invoice[]): string {
  if (invoices.length === 0) return 'INV-1001';
  
  // Find highest invoice sequential ending numbers
  const nums = invoices.map(inv => {
    const part = inv.invoiceNumber.replace('INV-', '');
    const num = parseInt(part, 10);
    return isNaN(num) ? 1000 : num;
  });
  
  const maxNum = Math.max(...nums, 1000);
  return `INV-${maxNum + 1}`;
}
