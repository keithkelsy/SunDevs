/** Plain product shape returned by Mongoose .lean() */
export interface ProductPlain {
  _id: unknown;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  available: boolean;
  modifierGroups: ModifierGroupPlain[];
}

export interface ModifierGroupPlain {
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOptionPlain[];
}

export interface ModifierOptionPlain {
  name: string;
  priceAdjustment: number;
}

/** A single category with its products — used in the grouped response */
export interface MenuCategory {
  name: string;
  products: MenuProductItem[];
}

export interface MenuProductItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  modifierGroups: ModifierGroupPlain[];
}

/** GET /menu response shape */
export interface GroupedMenu {
  categories: MenuCategory[];
}

/** GET /menu/:id response shape */
export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  available: boolean;
  modifierGroups: ModifierGroupPlain[];
}
