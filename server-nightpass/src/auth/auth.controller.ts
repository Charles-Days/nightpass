import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';

const STRICT_AUTH_THROTTLE = { default: { ttl: 60_000, limit: 5 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(STRICT_AUTH_THROTTLE)
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT_AUTH_THROTTLE)
  signin(@Body() dto: SigninDto) {
    return this.auth.signin(dto);
  }

  @Post('signin-web')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT_AUTH_THROTTLE)
  signinWeb(@Body() dto: SigninDto) {
    return this.auth.signinWeb(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT_AUTH_THROTTLE)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword).then(() => ({ ok: true }));
  }
}
