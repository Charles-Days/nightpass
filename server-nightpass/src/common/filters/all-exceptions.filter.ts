import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

// Tipos mínimos del reply/request de Fastify sin depender del paquete 'fastify'
// directamente (es dep transitiva de @nestjs/platform-fastify, no resuelve como
// módulo de tipos en este tsconfig).
interface FastifyReplyLike {
  status(code: number): { send(payload: unknown): unknown };
}
interface FastifyRequestLike {
  method: string;
  url: string;
}

/**
 * Filtro global de excepciones. Normaliza el shape de la respuesta de error y
 * evita filtrar stack traces / detalles internos al cliente. Los 5xx se loguean
 * con contexto; el cuerpo que ve el cliente es genérico.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReplyLike>();
    const req = ctx.getRequest<FastifyRequestLike>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Para HttpException respetamos su payload (validación, 4xx de negocio).
    // Para todo lo demás devolvemos un mensaje genérico — nunca el error crudo.
    let body: Record<string, unknown>;
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      body =
        typeof res === 'string'
          ? { statusCode: status, message: res }
          : (res as Record<string, unknown>);
    } else {
      body = { statusCode: status, message: 'Error interno del servidor' };
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `${req.method} ${req.url} → ${status}: ${err.message}`,
        err.stack,
      );
    }

    reply.status(status).send(body);
  }
}
