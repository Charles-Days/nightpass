import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQuery } from './dto/list-orders.query';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user.id, dto.tierId, dto.referralCode);
  }

  @Get('me')
  listMine(
    @Query() query: ListOrdersQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.listMine(user.id, query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }
}
