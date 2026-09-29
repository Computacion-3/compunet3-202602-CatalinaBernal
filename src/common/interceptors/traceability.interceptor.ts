import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class TraceabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request: Request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID();

    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const now = Date.now();
    return next.handle().pipe(
        tap(() => {
          const responseTime = Date.now() - now;
          const status = `${response.statusCode} ${response.statusMessage}`;

          console.info(
            `[TRACE] [${request.method} ${request.originalUrl}] [${status}] [Duration: ${responseTime}ms] [CorrelationID: ${correlationId}]`,
          );
        })
    );
  }
}