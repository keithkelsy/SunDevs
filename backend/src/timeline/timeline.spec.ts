import { TimelineService } from './timeline.service';
import { TimelineEventType } from './enums/timeline-event-type.enum';
import { TimelineEventSource } from './enums/timeline-event-source.enum';

/**
 * Test 4: Timeline — append-only, ordering, pagination, dedup
 */
describe('TimelineService', () => {
  let service: TimelineService;
  let mockRepo: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findByOrderId: jest.Mock;
    findByCorrelationId: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({ ...data, _id: 'doc-1' }),
      ),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(true),
      findByOrderId: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      }),
      findByCorrelationId: jest.fn().mockResolvedValue([]),
    };
    service = new TimelineService(mockRepo as never);
  });

  describe('addEvent', () => {
    it('should create an event with auto-generated eventId and timestamp', async () => {
      await service.addEvent({
        orderId: 'order-1',
        userId: 'user-1',
        type: TimelineEventType.ORDER_PLACED,
        source: TimelineEventSource.API,
        correlationId: 'corr-1',
        payload: { status: 'PENDING' },
      });

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      const createdEvent = mockRepo.create.mock.calls[0]![0];
      expect(createdEvent.eventId).toBeDefined();
      expect(createdEvent.timestamp).toBeDefined();
      expect(createdEvent.orderId).toBe('order-1');
      expect(createdEvent.type).toBe(TimelineEventType.ORDER_PLACED);
    });

    it('should silently skip events with payload exceeding 16KB', async () => {
      const largePayload = { data: 'x'.repeat(20000) };

      // Should resolve without throwing — silently skips oversized payloads
      await service.addEvent({
        orderId: 'order-1',
        userId: 'user-1',
        type: TimelineEventType.ORDER_PLACED,
        source: TimelineEventSource.API,
        correlationId: 'corr-1',
        payload: largePayload,
      });

      // Repository.create should NOT have been called
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should silently handle duplicate eventId (dedup)', async () => {
      // Simulate MongoDB duplicate key error
      const dupError = new Error('dup') as Error & { code: number };
      dupError.code = 11000;
      mockRepo.create.mockRejectedValue(dupError);

      // Should NOT throw — silently deduplicate
      await expect(
        service.addEvent({
          orderId: 'order-1',
          userId: 'user-1',
          type: TimelineEventType.ORDER_PLACED,
          source: TimelineEventSource.API,
          correlationId: 'corr-1',
          payload: {},
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('getOrderTimeline', () => {
    it('should return paginated timeline events', async () => {
      const mockEvents = [
        { eventId: 'e1', timestamp: '2024-01-01T00:00:00Z', type: 'ORDER_PLACED' },
        { eventId: 'e2', timestamp: '2024-01-01T00:00:01Z', type: 'ORDER_STATUS_CHANGED' },
      ];
      mockRepo.findByOrderId.mockResolvedValue({
        data: mockEvents,
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const result = await service.getOrderTimeline('order-1', 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(mockRepo.findByOrderId).toHaveBeenCalledWith('order-1', 1, 20);
    });

    it('should respect pagination parameters', async () => {
      mockRepo.findByOrderId.mockResolvedValue({
        data: [],
        total: 100,
        page: 3,
        pageSize: 10,
        totalPages: 10,
      });

      const result = await service.getOrderTimeline('order-1', 3, 10);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(10);
    });
  });

  describe('generateCorrelationId', () => {
    it('should return a valid UUID', () => {
      const id = service.generateCorrelationId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => service.generateCorrelationId()));
      expect(ids.size).toBe(100);
    });
  });
});
