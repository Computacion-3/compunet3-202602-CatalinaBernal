import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { TraceabilityInterceptor } from '../interceptors/traceability.interceptor'; // Ajusta la ruta

import { AppLogger } from './logger.service';

@Global()
@Module({
    providers: [
        AppLogger,
        {
            provide: APP_INTERCEPTOR,
            useClass: TraceabilityInterceptor,
        },
    ],
    exports: [AppLogger],
})
export class LoggerModule {}
