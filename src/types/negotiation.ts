// Bulk Offer & Custom Production Request types (shared between customer pages)

export interface Attachment {
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface OfferMessage {
  senderRole: 'buyer' | 'seller' | 'admin' | 'system';
  senderName?: string;
  qty?: number;
  unitPrice?: number;
  currency?: string;
  notes?: string;
  message?: string;
  attachments?: Attachment[];
  createdAt?: string;
}

export interface ShippingAddressSnapshot {
  companyName?: string;
  contactPerson?: string;
  mobileNumber?: string;
  country?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  notes?: string;
}

export interface BulkOffer {
  _id: string;
  productId: string;
  vendorId: string;
  buyerUserId: string;
  productSnapshot: {
    title?: string;
    slug?: string;
    imageUrl?: string;
    currency?: string;
    moq?: number;
  };
  vendorSnapshot: { storeName?: string; storeSlug?: string };
  buyerSnapshot: {
    email?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  currentQty: number;
  currentUnitPrice: number;
  currentTotal?: number;
  currency: string;
  lastActionBy: 'buyer' | 'seller';
  validUntil: string;
  status:
    | 'requested'
    | 'countered'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'cancelled';
  messages: OfferMessage[];
  shippingAddress?: ShippingAddressSnapshot | null;
  paymentLink?: {
    token?: string;
    generatedAt?: string;
    expiresAt?: string;
    usedAt?: string;
    orderId?: string;
  };
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quotation {
  unitPrice: number;
  totalPrice?: number;
  currency: string;
  leadTimeDays?: number;
  productionNotes?: string;
  termsAndConditions?: string;
  quotedAt?: string;
}

export interface CustomProductionRequest {
  _id: string;
  productId: string;
  vendorId: string;
  buyerUserId: string;
  productSnapshot: { title?: string; slug?: string; imageUrl?: string; currency?: string };
  vendorSnapshot: { storeName?: string; storeSlug?: string };
  buyerSnapshot: {
    email?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  qty: number;
  specifications: string;
  deliveryExpectations?: string;
  attachments?: Attachment[];
  shippingAddress?: ShippingAddressSnapshot | null;
  validUntil: string;
  status:
    | 'requested'
    | 'quoted'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'cancelled'
    | 'in_production'
    | 'completed';
  messages: OfferMessage[];
  quotation?: Quotation | null;
  paymentLink?: {
    token?: string;
    generatedAt?: string;
    expiresAt?: string;
    usedAt?: string;
    orderId?: string;
  };
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
}