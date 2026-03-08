import { Expose, Type } from 'class-transformer';
import { TimelineEventResponseDto } from './timeline-event-response.dto';

export class PaginatedTimelineDto {
  @Expose()
  @Type(() => TimelineEventResponseDto)
  data!: TimelineEventResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  pageSize!: number;

  @Expose()
  totalPages!: number;
}
