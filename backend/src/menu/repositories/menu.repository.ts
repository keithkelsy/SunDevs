import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { IMenuRepository } from '../interfaces/menu-repository.interface';

/**
 * Mongoose implementation of IMenuRepository.
 * If we need to swap to DynamoDB, we create a new class implementing
 * IMenuRepository and change the provider binding — no service changes needed.
 */
@Injectable()
export class MenuRepository implements IMenuRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async findById(id: string): Promise<Product | null> {
    return this.productModel.findById(id).lean().exec();
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().lean().exec();
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productModel.find({ category }).lean().exec();
  }

  async findAvailable(): Promise<Product[]> {
    return this.productModel.find({ available: true }).lean().exec();
  }

  async create(entity: Partial<Product>): Promise<Product> {
    const created = new this.productModel(entity);
    const saved = await created.save();
    return saved.toObject();
  }

  async update(id: string, entity: Partial<Product>): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, entity, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
