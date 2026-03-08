import { PayloadTooLargeException } from '@nestjs/common';
import { PayloadSizeGuard } from './payload-size.guard';

/**
 * Test 6: Payload Size Guard — 16KB limit enforcement
 */
describe('PayloadSizeGuard', () => {
  const DEFAULT_MAX = 16384; // 16KB

  function createGuard(maxSize?: number): PayloadSizeGuard {
    const mockConfig = {
      get: jest.fn().mockReturnValue(maxSize ?? DEFAULT_MAX),
    };
    return new PayloadSizeGuard(mockConfig as never);
  }

  function createMockContext(contentLength: string | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'content-length': contentLength,
          },
        }),
      }),
    } as never;
  }

  it('should allow requests under the 16KB limit', () => {
    const guard = createGuard();
    const ctx = createMockContext('1024'); // 1KB

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow requests exactly at the 16KB limit', () => {
    const guard = createGuard();
    const ctx = createMockContext('16384');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject requests exceeding the 16KB limit', () => {
    const guard = createGuard();
    const ctx = createMockContext('16385'); // 1 byte over

    expect(() => guard.canActivate(ctx)).toThrow(PayloadTooLargeException);
  });

  it('should reject large payloads (e.g. 20KB)', () => {
    const guard = createGuard();
    const ctx = createMockContext('20480');

    expect(() => guard.canActivate(ctx)).toThrow(PayloadTooLargeException);
  });

  it('should allow requests with no content-length header', () => {
    const guard = createGuard();
    const ctx = createMockContext(undefined);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should respect a custom max size from config', () => {
    const guard = createGuard(1024); // 1KB limit
    const small = createMockContext('512');
    const large = createMockContext('2048');

    expect(guard.canActivate(small)).toBe(true);
    expect(() => guard.canActivate(large)).toThrow(PayloadTooLargeException);
  });
});
