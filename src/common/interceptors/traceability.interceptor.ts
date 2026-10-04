import * as crypto from 'crypto';

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Request, Response } from 'express';

import { AppLogger } from '../logger/logger.service';

interface CustomRequest extends Request {
    correlationId?: string;
}

@Injectable()
export class TraceabilityInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLogger) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<CustomRequest>();
        const response = httpContext.getResponse<Response>();

        const headerCid = request.headers['x-correlation-id'];
        const suppliedCorrelationId = Array.isArray(headerCid) ? headerCid[0] : headerCid;
        const correlationId = suppliedCorrelationId?.trim() || crypto.randomUUID();

        request.correlationId = correlationId;
        response.setHeader('x-correlation-id', correlationId);

        const now = Date.now();

        return next.handle().pipe(
            finalize(() => {
                const responseTime = Date.now() - now;
                const statusText = response.statusMessage || 'OK';
                const status = `${response.statusCode} ${statusText}`;
                const url = request.originalUrl || request.url;

                const message = `[TRACE] [${request.method} ${url}] [${status}] [Duration: ${responseTime}ms] [CorrelationID: ${correlationId}]`;

                this.logger.logWithTrace(correlationId, 'INFO', message);
            }),
        );
    }
}
