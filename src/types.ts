export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
  isPopular?: boolean;
  isDailyOffer?: boolean;
  isUpsell?: boolean;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type DeliveryType = 'domicilio' | 'recoger' | 'local';
export type PaymentMethod = 'nequi' | 'efectivo';

export interface Order {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  loyaltyOptIn?: boolean;
  pointsGranted?: boolean;
  location?: { lat: number; lng: number } | null;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'completed';
  createdAt: string;
  notes?: string;
}

export interface StoreSettings {
  isStoreOpen: boolean;
  loyaltyEnabled: boolean;
  loyaltyPrize: string;
  loyaltyGoal: number;
  referralEnabled: boolean;
  adminPin?: string;
}

export interface Customer {
  id?: string;
  phone: string;
  stamps: number;
  referredBy?: string;
  createdAt: string;
}

export interface Review {
  id?: string;
  customerName: string;
  text: string;
  rating: number;
  isVisible: boolean;
  createdAt: string;
}
