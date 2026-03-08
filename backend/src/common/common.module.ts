import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PayloadSizeGuard } from './guards/payload-size.guard';
import { RedisService } from './services/redis.service';

// Global module — exports are available application-wide without explicit imports
@Global()
@Module({
  providers: [
    RedisService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: PayloadSizeGuard },
  ],
  exports: [RedisService],
})
export class CommonModule {}
