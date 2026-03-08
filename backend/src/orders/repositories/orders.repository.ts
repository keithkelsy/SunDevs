import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { OrderStatus } from '../enums/order-status.enum';
import { IOrdersRepository } from '../interfaces/orders-repository.interface';

/**
 * Mongoose implementation of IOrdersRepository.
 * Swap-friendly: replace this class in the module providers to use DynamoDB.
 */
@Injectable()
export class OrdersRepository implements IOrdersRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    return this.orderModel.findById(id).lean().exec();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().lean().exec();
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).lean().exec();
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderModel.find({ status }).lean().exec();
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    return this.orderModel.findOne({ idempotencyKey: key }).lean().exec();
  }

  async create(entity: Partial<Order>): Promise<Order> {
    const created = new this.orderModel(entity);
    const saved = await created.save();
    return saved.toObject();
  }

  async update(id: string, entity: Partial<Order>): Promise<Order | null> {
    return this.orderModel
      .findByIdAndUpdate(id, entity, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
