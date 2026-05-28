import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  mustChangePassword: boolean;
  locationOnboardedAt: Date | null;
  createdAt: Date;
}

export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  private getGoogleClient(clientId: string): OAuth2Client {
    if (!this.googleClient) this.googleClient = new OAuth2Client(clientId);
    return this.googleClient;
  }

  async signup(dto: SignupDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    // Equalize timing — hash the password regardless of whether the email exists,
    // so an attacker cannot distinguish existing vs new emails by response time.
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTS);

    if (existing) {
      this.logger.warn(`Signup blocked — duplicate email attempt: ${email}`);
      throw new ConflictException('No se pudo completar el registro');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
      },
    });

    void this.mailer
      .sendCustomerWelcome(user.email, user.name ?? 'amig@')
      .catch((err) =>
        this.logger.error(
          `Email bienvenida CUSTOMER falló: ${err instanceof Error ? err.message : err}`,
        ),
      );

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.mustChangePassword);
    return { ...tokens, user: this.publicUser(user) };
  }

  async signin(dto: SigninDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new ConflictException({
        code: 'OAUTH_ONLY',
        message: 'Esta cuenta entra con Google. Toca "Continuar con Google".',
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.mustChangePassword);
    return { ...tokens, user: this.publicUser(user) };
  }

  async signinWithGoogle(idToken: string): Promise<AuthResult> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException('Google sign-in no configurado');
    }

    const client = this.getGoogleClient(clientId);
    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Google idToken verify failed: ${msg}`);
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Token de Google sin datos requeridos');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Email de Google no verificado');
    }

    const sub = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name ?? null;

    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerSub: { provider: OAuthProvider.GOOGLE, providerSub: sub } },
      include: { user: true },
    });

    let user;
    if (existingOAuth) {
      user = existingOAuth.user;
    } else {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = existingByEmail;
        await this.prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider: OAuthProvider.GOOGLE,
            providerSub: sub,
            email,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            name,
            passwordHash: null,
            oauthAccounts: {
              create: { provider: OAuthProvider.GOOGLE, providerSub: sub, email },
            },
          },
        });

        void this.mailer
          .sendCustomerWelcome(user.email, user.name ?? 'amig@')
          .catch((err) =>
            this.logger.error(
              `Email bienvenida Google falló: ${err instanceof Error ? err.message : err}`,
            ),
          );
      }
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.mustChangePassword);
    return { ...tokens, user: this.publicUser(user) };
  }

  async signinWeb(dto: SigninDto): Promise<AuthResult> {
    const result = await this.signin(dto);
    if (result.user.role === 'CUSTOMER') {
      throw new ForbiddenException('CUSTOMER_NOT_ALLOWED_ON_WEB');
    }
    return result;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);

    const user = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored) {
        throw new UnauthorizedException('Refresh token not active');
      }
      if (stored.userId !== payload.sub) {
        throw new UnauthorizedException('Token mismatch');
      }
      if (stored.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        this.logger.warn(
          `Refresh reuse detected for user ${stored.userId}; revoked all active tokens`,
        );
        throw new UnauthorizedException('Refresh token not active');
      }
      if (stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token not active');
      }

      const rotation = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (rotation.count !== 1) {
        throw new UnauthorizedException('Refresh token not active');
      }

      const userRecord = await tx.user.findUnique({ where: { id: payload.sub } });
      if (!userRecord) {
        throw new UnauthorizedException('User not found');
      }
      return userRecord;
    });

    return this.issueTokens(user.id, user.email, user.role, user.mustChangePassword);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        locationOnboardedAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.publicUser(user);
  }

  async markLocationOnboarded(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locationOnboardedAt: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        locationOnboardedAt: true,
        createdAt: true,
      },
    });
    return this.publicUser(user);
  }

  async updateMe(userId: string, data: { name?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
    });
    return this.publicUser(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new ConflictException({
        code: 'OAUTH_ONLY',
        message: 'Esta cuenta usa Google. Configura una contraseña primero.',
      });
    }
    const valid = await argon2.verify(user.passwordHash, oldPassword);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');
    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.log(`Reset request para email inexistente: ${email}`);
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresInMinutes = 60;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress,
      },
    });

    const webUrl = this.config.get<string>('ADMIN_WEB_URL') ?? 'http://localhost:7100';
    const resetPath = user.role === Role.CUSTOMER ? '/app/restablecer-password' : '/reset-password';
    const resetUrl = `${webUrl.replace(/\/$/, '')}${resetPath}?token=${token}`;

    void this.mailer
      .sendPasswordReset(user.email, user.name ?? 'amig@', resetUrl, expiresInMinutes)
      .catch((err) =>
        this.logger.error(
          `Email password reset falló (${user.email}): ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    void this.mailer
      .sendPasswordChanged(record.user.email, record.user.name ?? 'amig@')
      .catch((err) =>
        this.logger.error(
          `Email password changed falló (${record.user.email}): ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    mustChangePassword: boolean,
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, mustChangePassword },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL'),
      },
    );

    const jti = randomBytes(16).toString('hex');
    const refreshTtl = this.config.getOrThrow<string>('JWT_REFRESH_TTL');
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.computeExpiry(refreshTtl),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private computeExpiry(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms =
      unit === 's'
        ? value * 1000
        : unit === 'm'
          ? value * 60_000
          : unit === 'h'
            ? value * 3_600_000
            : value * 86_400_000;
    return new Date(Date.now() + ms);
  }

  private publicUser(user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    mustChangePassword: boolean;
    locationOnboardedAt?: Date | null;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      locationOnboardedAt: user.locationOnboardedAt ?? null,
      createdAt: user.createdAt,
    };
  }
}
