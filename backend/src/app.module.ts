import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as Joi from 'joi';
import { CommonModule } from './common/common.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { TimelineModule } from './timeline/timeline.module';

@Module({
  imports: [
    // ConfigModule validates env vars at startup — fail fast if misconfigured
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'log', 'debug', 'verbose')
          .default('debug'),
        DEFAULT_PAGE_SIZE: Joi.number().integer().min(1).max(50).default(20),
        MAX_PAGE_SIZE: Joi.number().integer().min(1).max(50).default(50),
        MAX_PAYLOAD_SIZE: Joi.number().integer().default(16384),
        SERVICE_FEE_BASIS_POINTS: Joi.number().integer().min(0).default(500),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
    // MongooseModule uses factory pattern to inject validated config
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    // EventEmitter for async order processing (fire-and-forget pattern)
    EventEmitterModule.forRoot(),
    CommonModule,
    MenuModule,
    OrdersModule,
    TimelineModule,
  ],
})
export class AppModule {}
