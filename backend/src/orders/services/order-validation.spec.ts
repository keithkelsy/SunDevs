import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders.service';

/**
 * Test 3: Modifier Max Validation
 *
 * Validates modifier selection rules:
 * - Required groups must have minSelections
 * - maxSelections cannot be exceeded
 * - Unknown groups/options are rejected
 * - Missing product throws
 * - Happy path passes validation
 */
describe('Order Validation — Modifier Rules', () => {
  let service: OrdersService;
  let mockMenuService: { getProductById: jest.Mock };
  let mockOrdersRepo: { create: jest.Mock; findById: jest.Mock };
  let mockTimelineService: {
    addEvent: jest.Mock;
    generateCorrelationId: jest.Mock;
  };
  let mockConfigService: { get: jest.Mock };
  let mockEventEmitter: { emit: jest.Mock };

  const PRODUCT_WITH_MODIFIERS = {
    id: 'product-1',
    name: 'Classic Burger',
    description: 'Test burger',
    category: 'Burgers',
    basePrice: 899,
    available: true,
    modifierGroups: [
      {
        name: 'Protein',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Beef', priceAdjustment: 0 },
          { name: 'Chicken', priceAdjustment: 100 },
        ],
      },
      {
        name: 'Toppings',
        required: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: 'Cheese', priceAdjustment: 75 },
          { name: 'Bacon', priceAdjustment: 125 },
          { name: 'Lettuce', priceAdjustment: 0 },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockMenuService = {
      getProductById: jest.fn().mockResolvedValue(PRODUCT_WITH_MODIFIERS),
    };
    mockOrdersRepo = {
      create: jest.fn().mockResolvedValue({ _id: 'order-1' }),
      findById: jest.fn(),
    };
    mockTimelineService = {
      addEvent: jest.fn().mockResolvedValue(undefined),
      generateCorrelationId: jest.fn().mockReturnValue('corr-1'),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue(500),
    };
    mockEventEmitter = {
      emit: jest.fn(),
    };

    service = new OrdersService(
      mockOrdersRepo as never,
      mockMenuService as never,
      mockTimelineService as never,
      mockConfigService as never,
      mockEventEmitter as never,
    );
  });

  it('should reject when required modifier group has 0 selections', async () => {
    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              selectedModifiers: {},
            },
          ],
        },
        'user-1',
        'key-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject when exceeding maxSelections for a required group', async () => {
    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              selectedModifiers: {
                Protein: ['Beef', 'Chicken'], // max is 1
              },
            },
          ],
        },
        'user-1',
        'key-2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject when exceeding maxSelections for an optional group', async () => {
    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              selectedModifiers: {
                Protein: ['Beef'],
                Toppings: ['Cheese', 'Bacon', 'Lettuce'], // max is 2
              },
            },
          ],
        },
        'user-1',
        'key-3',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject unknown modifier group names', async () => {
    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              selectedModifiers: {
                Protein: ['Beef'],
                Extras: ['Extra Cheese'], // unknown group
              },
            },
          ],
        },
        'user-1',
        'key-4',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject unknown option names within a group', async () => {
    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              selectedModifiers: {
                Protein: ['Turkey'], // unknown option
              },
            },
          ],
        },
        'user-1',
        'key-5',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject non-existent product', async () => {
    mockMenuService.getProductById.mockRejectedValue(
      new Error('Not found'),
    );

    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'nonexistent-id',
              quantity: 1,
            },
          ],
        },
        'user-1',
        'key-6',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should pass validation with correct required + optional modifiers', async () => {
    const result = await service.createOrder(
      {
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            selectedModifiers: {
              Protein: ['Chicken'],
              Toppings: ['Cheese'],
            },
          },
        ],
      },
      'user-1',
      'key-7',
    );

    expect(result).toEqual({
      orderId: 'order-1',
      status: 'PENDING',
      message: 'Order received and being processed',
    });
    expect(mockOrdersRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should pass validation with only required modifiers (no optional)', async () => {
    const result = await service.createOrder(
      {
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            selectedModifiers: {
              Protein: ['Beef'],
            },
          },
        ],
      },
      'user-1',
      'key-8',
    );

    expect(result.orderId).toBe('order-1');
    expect(result.status).toBe('PENDING');
  });
});
