import {
  CanActivate,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard that rejects requests exceeding the configured payload size limit.
 * Prevents abuse and ensures timeline event payloads stay within 16KB.
 */
@Injectable()
export class PayloadSizeGuard implements CanActivate {
  private readonly maxSize: number;

  constructor(private readonly config: ConfigService) {
    this.maxSize = this.config.get<number>('MAX_PAYLOAD_SIZE', 16384);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const contentLength = parseInt(
      request.headers['content-length'] ?? '0',
      10,
    );
    if (contentLength > this.maxSize) {
      throw new PayloadTooLargeException(
        `Payload size ${contentLength} bytes exceeds the ${this.maxSize} byte limit`,
      );
    }
    return true;
  }
}
