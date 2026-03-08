import { BadRequestException, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

/**
 * Test 2: Idempotent POST /orders
 *
 * Validates the IdempotencyInterceptor:
 * - Requires Idempotency-Key header
 * - Validates UUID format
 * - Returns cached response on duplicate key
 * - Proceeds normally on new key
 * - Different keys produce different results
 */
describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockRedisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    setnx: jest.Mock;
  };

  beforeEach(() => {
    mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      setnx: jest.fn().mockResolvedValue(true),
    };
    interceptor = new IdempotencyInterceptor(mockRedisService as never);
  });

  function createMockContext(idempotencyKey?: string) {
    const request = {
      headers: idempotencyKey
        ? { 'idempotency-key': idempotencyKey }
        : {},
    };
    const response = {
      status: jest.fn(),
      statusCode: HttpStatus.ACCEPTED,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      response,
    };
  }

  function createMockNext(body: unknown) {
    return { handle: () => of(body) };
  }

  const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const ANOTHER_UUID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

  it('should throw if Idempotency-Key header is missing', () => {
    const ctx = createMockContext();
    const next = createMockNext({});

    expect(() =>
      interceptor.intercept(ctx as never, next as never),
    ).toThrow(BadRequestException);
  });

  it('should throw if Idempotency-Key is not a valid UUID', () => {
    const ctx = createMockContext('not-a-uuid');
    const next = createMockNext({});

    expect(() =>
      interceptor.intercept(ctx as never, next as never),
    ).toThrow(BadRequestException);
  });

  it('should proceed and cache on first request with valid UUID', (done) => {
    const responseBody = { orderId: 'order-1', status: 'PENDING' };
    const ctx = createMockContext(VALID_UUID);
    const next = createMockNext(responseBody);

    mockRedisService.get.mockResolvedValue(null); // cache miss

    const result$ = interceptor.intercept(ctx as never, next as never);
    result$.subscribe({
      next: (val) => {
        expect(val).toEqual(responseBody);
        // Should have tried to cache the response
        expect(mockRedisService.set).toHaveBeenCalled();
        const [key] = mockRedisService.set.mock.calls[0] as [string];
        expect(key).toBe(`idempotency:${VALID_UUID}`);
        done();
      },
    });
  });

  it('should return cached response on duplicate key', (done) => {
    const cachedBody = { orderId: 'order-1', status: 'PENDING' };
    const cached = JSON.stringify({
      statusCode: HttpStatus.ACCEPTED,
      body: cachedBody,
    });

    mockRedisService.get.mockResolvedValue(cached); // cache hit
    const ctx = createMockContext(VALID_UUID);
    const next = createMockNext({ orderId: 'should-not-reach' });

    const result$ = interceptor.intercept(ctx as never, next as never);
    result$.subscribe({
      next: (val) => {
        expect(val).toEqual(cachedBody);
        // Should have set the response status to the cached status
        expect(ctx.response.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
        done();
      },
    });
  });

  it('should produce different results for different keys', (done) => {
    const body1 = { orderId: 'order-1' };
    const body2 = { orderId: 'order-2' };

    // First call — cache miss
    mockRedisService.get.mockResolvedValueOnce(null);
    const ctx1 = createMockContext(VALID_UUID);
    const next1 = createMockNext(body1);

    const result1$ = interceptor.intercept(ctx1 as never, next1 as never);
    result1$.subscribe({
      next: (val1) => {
        expect(val1).toEqual(body1);

        // Second call — different key, cache miss
        mockRedisService.get.mockResolvedValueOnce(null);
        const ctx2 = createMockContext(ANOTHER_UUID);
        const next2 = createMockNext(body2);

        const result2$ = interceptor.intercept(ctx2 as never, next2 as never);
        result2$.subscribe({
          next: (val2) => {
            expect(val2).toEqual(body2);
            expect((val2 as { orderId: string }).orderId).not.toBe(
              (val1 as { orderId: string }).orderId,
            );
            done();
          },
        });
      },
    });
  });

  it('should gracefully degrade when Redis is unavailable', (done) => {
    const responseBody = { orderId: 'order-1' };
    mockRedisService.get.mockRejectedValue(new Error('Redis down'));
    mockRedisService.set.mockRejectedValue(new Error('Redis down'));

    const ctx = createMockContext(VALID_UUID);
    const next = createMockNext(responseBody);

    const result$ = interceptor.intercept(ctx as never, next as never);
    result$.subscribe({
      next: (val) => {
        // Should still return the response despite Redis failure
        expect(val).toEqual(responseBody);
        done();
      },
    });
  });
});
