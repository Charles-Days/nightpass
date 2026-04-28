import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
