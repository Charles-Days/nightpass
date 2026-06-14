import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { OrdersService } from './orders.service';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.VENUE_OWNER)
export class EventSalesController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':eventId/sales')
  getSales(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.eventSales(eventId, user);
  }

  @Post(':eventId/orders/:orderId/thank-you')
  @HttpCode(HttpStatus.OK)
  sendThankYou(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.sendThankYouEmail(eventId, orderId, user);
  }

  @Get(':eventId/orders/:orderId/thank-you/preview')
  previewThankYou(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.previewThankYouEmail(eventId, orderId, user);
  }
}
