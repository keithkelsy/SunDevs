import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TimelineEvent,
  TimelineEventDocument,
} from '../schemas/timeline-event.schema';
import { ITimelineRepository } from '../interfaces/timeline-repository.interface';
import { PaginatedResponse } from '../../common/interfaces';

@Injectable()
export class TimelineRepository implements ITimelineRepository {
  constructor(
    @InjectModel(TimelineEvent.name)
    private readonly timelineModel: Model<TimelineEventDocument>,
  ) {}

  async findById(id: string): Promise<TimelineEvent | null> {
    return this.timelineModel.findOne({ eventId: id }).lean().exec();
  }

  async findAll(): Promise<TimelineEvent[]> {
    return this.timelineModel.find().lean().exec();
  }

  async findByOrderId(
    orderId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<TimelineEvent>> {
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.timelineModel
        .find({ orderId })
        .sort({ timestamp: 1 }) // Ascending — chronological order
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.timelineModel.countDocuments({ orderId }).exec(),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByCorrelationId(correlationId: string): Promise<TimelineEvent[]> {
    return this.timelineModel
      .find({ correlationId })
      .sort({ timestamp: 1 })
      .lean()
      .exec();
  }

  async create(entity: Partial<TimelineEvent>): Promise<TimelineEvent> {
    const created = new this.timelineModel(entity);
    const saved = await created.save();
    return saved.toObject();
  }

  async update(
    id: string,
    entity: Partial<TimelineEvent>,
  ): Promise<TimelineEvent | null> {
    return this.timelineModel
      .findOneAndUpdate({ eventId: id }, entity, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.timelineModel
      .findOneAndDelete({ eventId: id })
      .exec();
    return result !== null;
  }
}
