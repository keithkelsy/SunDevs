import { Product } from '../schemas/product.schema';
import { IRepository } from '../../common/interfaces';

/**
 * Menu repository interface — extends the generic repository with
 * domain-specific query methods. Services depend on this interface,
 * not on the Mongoose implementation, enabling data-layer swaps.
 */
export const MENU_REPOSITORY: unique symbol = Symbol('MENU_REPOSITORY');

export interface IMenuRepository extends IRepository<Product> {
  findByCategory(category: string): Promise<Product[]>;
  findAvailable(): Promise<Product[]>;
}
