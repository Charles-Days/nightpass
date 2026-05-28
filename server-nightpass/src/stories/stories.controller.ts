import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { StoriesService } from './stories.service';
import { UploadInitDto } from './dto/upload-init.dto';
import { CreateStoryDto } from './dto/create-story.dto';
import { ListMineStoriesQuery } from './dto/list-mine.query';

@Controller('stories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoriesController {
  constructor(private readonly service: StoriesService) {}

  @Post('upload-init')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF, Role.PROMOTER, Role.PROMOTER_STAFF)
  @HttpCode(HttpStatus.OK)
  uploadInit(@Body() dto: UploadInitDto, @CurrentUser() user: AuthUser) {
    return this.service.uploadInit(dto, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF, Role.PROMOTER, Role.PROMOTER_STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStoryDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get('mine')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  listMine(
    @Query() query: ListMineStoriesQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listMine(query.venueId, user);
  }

  @Get('mine-by-event/:eventId')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF, Role.PROMOTER, Role.PROMOTER_STAFF)
  listMineByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listMineByEvent(eventId, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF, Role.PROMOTER, Role.PROMOTER_STAFF)
  @HttpCode(HttpStatus.OK)
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.softDelete(id, user);
  }
}
