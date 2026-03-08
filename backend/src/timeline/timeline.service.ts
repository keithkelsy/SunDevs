import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ITimelineRepository,
  TIMELINE_REPOSITORY,
} from './interfaces/timeline-repository.interface';
import { TimelineEventType } from './enums/timeline-event-type.enum';
import { TimelineEventSource } from './enums/timeline-event-source.enum';
import type { PaginatedResponse } from '../common/interfaces';
import type { TimelineEvent } from './schemas/timeline-event.schema';

const MAX_PAYLOAD_BYTES = 16384; // 16KB

export interface AddEventParams {
  orderId: string;
  userId: string;
  type: TimelineEventType;
  source: TimelineEventSource;
  correlationId: string;
  payload?: Record<string, unknown>;
}

/**
 * Timeline service — append-only audit log for order lifecycle events.
 * Events are immutable once created. Deduplication by eventId (UUID v4)
 * ensures idempotent writes even if the same event is emitted twice.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    @Inject(TIMELINE_REPOSITORY)
    private readonly timelineRepository: ITimelineRepository,
  ) {}

  /**
   * Append a new event to the timeline.
   * Auto-generates eventId (UUID v4) and timestamp (ISO 8601).
   * Validates payload does not exceed 16KB.
   * Deduplicates silently by catching unique index violations.
   */
  async addEvent(params: AddEventParams): Promise<void> {
    const payload = params.payload ?? {};

    // Validate payload size before persisting
    const payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf-8');
    if (payloadSize > MAX_PAYLOAD_BYTES) {
      this.logger.warn(
        `Payload for event type ${params.type} exceeds 16KB (${payloadSize} bytes) — skipping`,
      );
      return;
    }

    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      orderId: params.orderId,
      userId: params.userId,
      type: params.type,
      source: params.source,
      correlationId: params.correlationId,
      payload,
    };

    try {
      await this.timelineRepository.create(event);
    } catch (error) {
      // Deduplicate: if eventId already exists (unique index), ignore silently
      if (this.isDuplicateKeyError(error)) {
        this.logger.debug(`Duplicate event ${event.eventId} — ignored`);
        return;
      }
      throw error;
    }
  }

  /**
   * Retrieve paginated timeline events for an order, sorted by timestamp ascending.
   */
  async getOrderTimeline(
    orderId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<TimelineEvent>> {
    return this.timelineRepository.findByOrderId(orderId, page, pageSize);
  }

  /** Generate a new correlation ID for grouping related events */
  generateCorrelationId(): string {
    return uuidv4();
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
