import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_PASSWORD_CHANGE_PENDING } from '../decorators/allow-password-change-pending.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    // Enforce mustChangePassword en el backend (antes solo lo bloqueaba el
    // middleware del panel). Con una temp password filtrada, un atacante podía
    // pegarle a cualquier endpoint de negocio vía /auth/signin sin haberla
    // cambiado. Solo las rutas del propio flujo de cambio quedan exentas.
    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_PENDING,
      [context.getHandler(), context.getClass()],
    );
    if (allowPending) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        message: 'Debes cambiar tu contraseña temporal antes de continuar',
        errorCode: 'MUST_CHANGE_PASSWORD',
      });
    }
    return true;
  }
}
