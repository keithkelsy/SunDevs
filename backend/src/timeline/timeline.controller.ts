import { Controller } from '@nestjs/common';
import { TimelineService } from './timeline.service';

/**
 * Timeline controller — kept minimal.
 * The primary timeline endpoint (GET /orders/:orderId/timeline) is
 * co-located in OrdersController for cleaner URL nesting.
 * This controller is available for future standalone timeline queries.
 */
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}
}
