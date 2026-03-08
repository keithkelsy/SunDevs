export interface ModifierOption {
  name: string;
  priceAdjustment: number;
}

export interface ModifierGroup {
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
  name: string;
  products: Product[];
}

export interface MenuResponse {
  categories: MenuCategory[];
}
