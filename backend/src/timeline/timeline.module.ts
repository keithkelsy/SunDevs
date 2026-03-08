import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TimelineEvent,
  TimelineEventSchema,
} from './schemas/timeline-event.schema';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { TimelineRepository } from './repositories/timeline.repository';
import { TIMELINE_REPOSITORY } from './interfaces/timeline-repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimelineEvent.name, schema: TimelineEventSchema },
    ]),
  ],
  controllers: [TimelineController],
  providers: [
    TimelineService,
    { provide: TIMELINE_REPOSITORY, useClass: TimelineRepository },
  ],
  exports: [TimelineService],
})
export class TimelineModule {}
