import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  // Cambia el rol de un usuario (solo admin).
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  updateRole(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.service.updateRole(admin.id, id, dto.role);
  }
}
