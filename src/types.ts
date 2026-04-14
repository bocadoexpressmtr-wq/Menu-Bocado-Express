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
  selections?: string[];
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
  referredBy?: string | null;
  location?: { lat: number; lng: number } | null;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    selections?: string[];
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled' | 'archived';
  createdAt: string;
  notes?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
}

export interface StoreSettings {
  isStoreOpen: boolean;
  storeStatusMode?: 'manual' | 'auto';
  autoOpenTime?: string;
  autoCloseTime?: string;
  loyaltyEnabled: boolean;
  loyaltyPrize: string;
  loyaltyGoal: number;
  loyaltyMinOrder: number;
  referralEnabled: boolean;
  adminPin?: string;
  whatsappNumber?: string;
  nequiNumber?: string;
  whatsappMessageHeader?: string;
  whatsappMessageFooter?: string;
  shareText?: string;
  socialLinks?: SocialLink[];
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
  expiryDate?: string;
}

export interface Customer {
  id?: string;
  phone: string;
  name: string;
  lastUsedAddress?: string;
  stamps: number;
  referredBy?: string;
  totalOrders?: number;
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

export interface Feedback {
  id?: string;
  customerName: string;
  customerPhone?: string;
  message: string;
  type: 'queja' | 'sugerencia' | 'otro';
  status: 'unread' | 'read';
  createdAt: string;
}
