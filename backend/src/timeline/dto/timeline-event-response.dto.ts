import { Expose } from 'class-transformer';
import { TimelineEventType } from '../enums/timeline-event-type.enum';
import { TimelineEventSource } from '../enums/timeline-event-source.enum';

export class TimelineEventResponseDto {
  @Expose()
  eventId!: string;

  @Expose()
  timestamp!: string;

  @Expose()
  orderId!: string;

  @Expose()
  userId!: string;

  @Expose()
  type!: TimelineEventType;

  @Expose()
  source!: TimelineEventSource;

  @Expose()
  correlationId!: string;

  @Expose()
  payload!: Record<string, unknown>;
}
