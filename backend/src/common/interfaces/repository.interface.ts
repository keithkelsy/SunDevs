/**
 * Generic repository interface — defines a contract that any data-layer
 * implementation (MongoDB, DynamoDB, etc.) must satisfy.
 * Services depend on this abstraction, not on concrete implementations.
 * This is the Dependency Inversion Principle (SOLID "D").
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
