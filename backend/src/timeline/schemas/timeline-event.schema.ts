import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TimelineEventType } from '../enums/timeline-event-type.enum';
import { TimelineEventSource } from '../enums/timeline-event-source.enum';

export type TimelineEventDocument = HydratedDocument<TimelineEvent>;

/**
 * TimelineEvent — an immutable audit log entry for order lifecycle events.
 * Uses UUID v4 as eventId (not MongoDB ObjectId) for portability.
 * Payload is schema-less (Mixed) but capped at 16KB by the PayloadSizeGuard.
 */
@Schema({ timestamps: false, collection: 'timeline_events' })
export class TimelineEvent {
  @Prop({ required: true, unique: true, index: true })
  eventId!: string;

  @Prop({ required: true })
  timestamp!: string;

  @Prop({ required: true, index: true })
  orderId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, enum: TimelineEventType })
  type!: TimelineEventType;

  @Prop({ required: true, enum: TimelineEventSource })
  source!: TimelineEventSource;

  @Prop({ required: true, index: true })
  correlationId!: string;

  @Prop({ type: Object, default: {} })
  payload!: Record<string, unknown>;
}

export const TimelineEventSchema = SchemaFactory.createForClass(TimelineEvent);
