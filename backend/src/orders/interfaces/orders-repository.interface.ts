import { Order } from '../schemas/order.schema';
import { OrderStatus } from '../enums/order-status.enum';
import { IRepository } from '../../common/interfaces';

export const ORDERS_REPOSITORY: unique symbol = Symbol('ORDERS_REPOSITORY');

/**
 * Orders repository interface — extends generic repository with
 * order-specific queries. Abstracts the data layer so services
 * don't depend on Mongoose directly.
 */
export interface IOrdersRepository extends IRepository<Order> {
  findByUserId(userId: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
}
