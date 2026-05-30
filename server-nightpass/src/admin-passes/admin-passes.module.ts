import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPassesController } from './admin-passes.controller';
import { AdminPassesService } from './admin-passes.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPassesController],
  providers: [AdminPassesService],
  exports: [AdminPassesService],
})
export class AdminPassesModule {}
