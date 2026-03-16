export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxId?: string;
  country?: string;
  city?: string;
  addressLine?: string;
  contactPhone?: string;
  role: 'customer' | 'vendor' | 'admin';
  preferredLanguage?: 'en' | 'de' | 'tr';
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxId?: string;
  country?: string;
  city?: string;
  addressLine?: string;
  contactPhone?: string;
  preferredLanguage?: 'en' | 'de' | 'tr';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
