import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { StoriesController } from './stories.controller';
import { StoriesPublicController } from './stories-public.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [StoriesController, StoriesPublicController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
