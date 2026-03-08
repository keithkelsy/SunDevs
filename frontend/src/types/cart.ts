/** A single item in the cart (product + selected modifiers) */
export interface CartItem {
  id: string; // unique cart-item id (crypto.randomUUID)
  productId: string;
  productName: string;
  quantity: number;
  /** groupName -> selectedOptionNames */
  selectedModifiers: Record<string, string[]>;
}
