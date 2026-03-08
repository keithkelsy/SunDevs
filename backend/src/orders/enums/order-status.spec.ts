import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  isValidTransition,
} from './order-status.enum';

/**
 * Test 5: Order Status Transitions — FSM validation
 */
describe('Order Status FSM', () => {
  describe('valid forward transitions', () => {
    it('PENDING → CONFIRMED is valid', () => {
      expect(isValidTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    });

    it('CONFIRMED → PREPARING is valid', () => {
      expect(isValidTransition(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).toBe(true);
    });

    it('PREPARING → READY is valid', () => {
      expect(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
    });

    it('READY → COMPLETED is valid', () => {
      expect(isValidTransition(OrderStatus.READY, OrderStatus.COMPLETED)).toBe(true);
    });
  });

  describe('CANCELLED reachable from any non-terminal state', () => {
    it.each([
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
    ])('%s → CANCELLED is valid', (from) => {
      expect(isValidTransition(from, OrderStatus.CANCELLED)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('PENDING → READY is invalid (cannot skip steps)', () => {
      expect(isValidTransition(OrderStatus.PENDING, OrderStatus.READY)).toBe(false);
    });

    it('PENDING → COMPLETED is invalid (cannot skip steps)', () => {
      expect(isValidTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toBe(false);
    });

    it('CONFIRMED → COMPLETED is invalid (cannot skip steps)', () => {
      expect(isValidTransition(OrderStatus.CONFIRMED, OrderStatus.COMPLETED)).toBe(false);
    });

    it('READY → PREPARING is invalid (cannot go backwards)', () => {
      expect(isValidTransition(OrderStatus.READY, OrderStatus.PREPARING)).toBe(false);
    });

    it('CONFIRMED → PENDING is invalid (cannot go backwards)', () => {
      expect(isValidTransition(OrderStatus.CONFIRMED, OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('COMPLETED has no valid transitions', () => {
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([]);
    });

    it('CANCELLED has no valid transitions', () => {
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([]);
    });

    it.each(Object.values(OrderStatus))(
      'COMPLETED → %s is invalid',
      (to) => {
        expect(isValidTransition(OrderStatus.COMPLETED, to)).toBe(false);
      },
    );

    it.each(Object.values(OrderStatus))(
      'CANCELLED → %s is invalid',
      (to) => {
        expect(isValidTransition(OrderStatus.CANCELLED, to)).toBe(false);
      },
    );
  });
});
