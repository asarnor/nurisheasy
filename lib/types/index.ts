/**
 * Shared TypeScript types for SafePlate
 */

export type OrganizationType = 'consumer' | 'vendor';

export type OrderStatus = 'PROCESSING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';

export type SubOrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'REFUNDED'
  | 'CANCELLED';

export type AllergenTag =
  | 'PEANUT'
  | 'TREE_NUT'
  | 'SHELLFISH'
  | 'FISH'
  | 'EGG'
  | 'DAIRY'
  | 'SOY'
  | 'WHEAT'
  | 'GLUTEN'
  | 'SESAME';

export type PreferenceTag =
  | 'LOW_SODIUM'
  | 'LOW_FAT'
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'KOSHER'
  | 'HALAL';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: Coordinates;
}

export interface SafetyProfile {
  criticalAllergens: AllergenTag[];
  preferences: PreferenceTag[];
  taxExempt: boolean;
}
