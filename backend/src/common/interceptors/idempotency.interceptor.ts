import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { validate } from 'uuid';
import { RedisService } from '../services/redis.service';

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds

interface CachedEntry {
  statusCode: number;
  body: unknown;
}

/**
 * Idempotency interceptor — prevents duplicate side-effects for POST requests.
 *
 * Flow:
 * 1. Extract Idempotency-Key header (required, must be UUID v4)
 * 2. Check Redis for cached response under `idempotency:{key}`
 * 3. If found -> return cached response immediately (short-circuit)
 * 4. If not -> proceed with handler, then cache the response for 24h
 *
 * Graceful degradation: if Redis is unavailable, proceeds normally and
 * logs a warning. The DB unique index on idempotencyKey acts as fallback.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly redisService: RedisService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new BadRequestException(
        'Idempotency-Key header is required and must be a UUID v4',
      );
    }

    if (!validate(idempotencyKey)) {
      throw new BadRequestException(
        'Idempotency-Key header must be a valid UUID v4',
      );
    }

    const cacheKey = `idempotency:${idempotencyKey}`;

    return from(this.tryGetCached(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          this.logger.log(
            `Idempotent hit for key ${idempotencyKey} — returning cached response`,
          );
          response.status(cached.statusCode);
          return of(cached.body);
        }

        // Cache miss — proceed with handler and cache the result
        return next.handle().pipe(
          tap((body: unknown) => {
            const entry: CachedEntry = {
              statusCode: response.statusCode || HttpStatus.OK,
              body,
            };
            this.trySetCached(cacheKey, entry);
          }),
        );
      }),
    );
  }

  private async tryGetCached(key: string): Promise<CachedEntry | null> {
    try {
      const raw = await this.redisService.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as CachedEntry;
    } catch {
      this.logger.warn(
        'Redis unavailable for idempotency check — proceeding normally',
      );
      return null;
    }
  }

  private trySetCached(key: string, entry: CachedEntry): void {
    this.redisService
      .set(key, JSON.stringify(entry), IDEMPOTENCY_TTL)
      .catch(() => {
        this.logger.warn(
          'Redis unavailable — idempotency response not cached',
        );
      });
  }
}
