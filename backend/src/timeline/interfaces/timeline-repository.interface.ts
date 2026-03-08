import { TimelineEvent } from '../schemas/timeline-event.schema';
import { IRepository } from '../../common/interfaces';
import { PaginatedResponse } from '../../common/interfaces';

export const TIMELINE_REPOSITORY = Symbol('TIMELINE_REPOSITORY');

export interface ITimelineRepository extends IRepository<TimelineEvent> {
  findByOrderId(
    orderId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<TimelineEvent>>;

  findByCorrelationId(correlationId: string): Promise<TimelineEvent[]>;
}
