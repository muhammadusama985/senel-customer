export interface PriceTier {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  _id: string;
  vendorId: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  moq: number;
  priceTiers: PriceTier[];
  stockQty: number;
  imageUrls: string[];
  status: string;
  isFeatured: boolean;
  country?: string;
  avgRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt?: string;
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
  specs?: Record<string, any>;
  [key: string]: any; // Allow any additional fields
}

export interface ProductsResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Product[];
}