import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { GoogleSigninDto } from './dto/google-signin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';

const STRICT_AUTH_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
const FORGOT_THROTTLE = { default: { ttl: 3_600_000, limit: 5 } };

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

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT_AUTH_THROTTLE)
  google(@Body() dto: GoogleSigninDto) {
    return this.auth.signinWithGoogle(dto.idToken);
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

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  @Patch('me/location-onboarded')
  @UseGuards(JwtAuthGuard)
  markLocationOnboarded(@CurrentUser() user: AuthUser) {
    return this.auth.markLocationOnboarded(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(FORGOT_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.auth.requestPasswordReset(dto.email, ip);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT_AUTH_THROTTLE)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }
}
