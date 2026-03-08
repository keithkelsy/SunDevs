import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging interceptor — logs request/response lifecycle and masks PII fields.
 * PII masking prevents accidental exposure of sensitive data in logs,
 * which is critical for compliance (GDPR, PCI-DSS).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  // Fields whose values must be masked in logs
  private readonly piiFields = new Set([
    'email',
    'phone',
    'phoneNumber',
    'password',
    'creditCard',
    'ssn',
    'address',
    'cardNumber',
  ]);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    const maskedBody = this.maskPii(request.body);
    this.logger.log(`→ ${method} ${url} ${JSON.stringify(maskedBody)}`);

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - startTime;
        this.logger.log(`← ${method} ${url} ${elapsed}ms`);
      }),
    );
  }

  private maskPii(obj: unknown): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.maskPii(item));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.piiFields.has(key)) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskPii(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }
}
