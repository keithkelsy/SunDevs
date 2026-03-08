import { calculateServiceFee } from '../../common/constants/money.constants';

/**
 * Test 1: Pricing / Service Fee Logic
 *
 * Validates server-side pricing calculation:
 * - Base price * quantity
 * - Modifier price adjustments
 * - Service fee = round(subtotal * basisPoints / 10000)
 * - Total = subtotal + serviceFee
 */
describe('Order Pricing Logic', () => {
  const SERVICE_FEE_BP = 500; // 5%

  function computeItemTotal(
    basePrice: number,
    modifierAdjustments: number[],
    quantity: number,
  ): number {
    const modTotal = modifierAdjustments.reduce((s, a) => s + a, 0);
    return (basePrice + modTotal) * quantity;
  }

  describe('calculateServiceFee', () => {
    it('should calculate 5% fee correctly', () => {
      // 1000 cents * 500bp / 10000 = 50
      expect(calculateServiceFee(1000, SERVICE_FEE_BP)).toBe(50);
    });

    it('should round half-up correctly', () => {
      // 899 * 500 / 10000 = 44.95 → rounds to 45
      expect(calculateServiceFee(899, SERVICE_FEE_BP)).toBe(45);
    });

    it('should return 0 for 0 subtotal', () => {
      expect(calculateServiceFee(0, SERVICE_FEE_BP)).toBe(0);
    });

    it('should return 0 for 0 basis points', () => {
      expect(calculateServiceFee(1000, 0)).toBe(0);
    });
  });

  describe('item total — no modifiers', () => {
    it('should compute basePrice * quantity', () => {
      // French Fries: 399 cents, qty 2
      const total = computeItemTotal(399, [], 2);
      expect(total).toBe(798);
    });

    it('should handle quantity of 1', () => {
      const total = computeItemTotal(1299, [], 1);
      expect(total).toBe(1299);
    });
  });

  describe('item total — with modifiers', () => {
    it('should add modifier adjustments to base price', () => {
      // Classic Burger (899) + Chicken (+100) + Cheese (+75) = 1074 per unit
      const total = computeItemTotal(899, [100, 75], 1);
      expect(total).toBe(1074);
    });

    it('should multiply by quantity after adding modifiers', () => {
      // (899 + 100 + 75) * 2 = 2148
      const total = computeItemTotal(899, [100, 75], 2);
      expect(total).toBe(2148);
    });

    it('should handle modifiers with 0 adjustment', () => {
      // Beef (+0), Lettuce (+0), Tomato (+0) = still base price
      const total = computeItemTotal(899, [0, 0, 0], 1);
      expect(total).toBe(899);
    });
  });

  describe('full order pricing', () => {
    it('should compute correct total for a multi-item order', () => {
      // Item 1: Classic Burger + Chicken (+100) + Cheese (+75) x2 = (899+100+75)*2 = 2148
      const item1 = computeItemTotal(899, [100, 75], 2);
      expect(item1).toBe(2148);

      // Item 2: French Fries x1 = 399
      const item2 = computeItemTotal(399, [], 1);
      expect(item2).toBe(399);

      // Subtotal
      const subtotal = item1 + item2;
      expect(subtotal).toBe(2547);

      // Service fee: round(2547 * 500 / 10000) = round(127.35) = 127
      const serviceFee = calculateServiceFee(subtotal, SERVICE_FEE_BP);
      expect(serviceFee).toBe(127);

      // Total
      const total = subtotal + serviceFee;
      expect(total).toBe(2674);
    });

    it('should match the concrete example from the spec', () => {
      // Classic Burger ($8.99) + Chicken (+$1.00) + Cheese (+$0.75) x2
      // = (899 + 100 + 75) * 2 = 2148
      // Service fee = round(2148 * 500 / 10000) = round(107.4) = 107
      // Total = 2148 + 107 = 2255
      const itemTotal = computeItemTotal(899, [100, 75], 2);
      expect(itemTotal).toBe(2148);

      const fee = calculateServiceFee(itemTotal, SERVICE_FEE_BP);
      expect(fee).toBe(107);

      expect(itemTotal + fee).toBe(2255);
    });
  });
});
