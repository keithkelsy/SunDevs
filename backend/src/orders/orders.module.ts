import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';
import { ORDERS_REPOSITORY } from './interfaces/orders-repository.interface';
import { OrderProcessorListener } from './listeners/order-processor.listener';
import { MenuModule } from '../menu/menu.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MenuModule,
    TimelineModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_REPOSITORY, useClass: OrdersRepository },
    OrderProcessorListener,
  ],
})
export class OrdersModule {}
