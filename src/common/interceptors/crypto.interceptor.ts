import * as crypto from 'crypto';

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoInterceptor implements NestInterceptor {
    private readonly algorithm = 'aes-256-cbc';
    private readonly secretKey: Buffer;
    // Vector de inicialización fijo de 16 bytes
    private readonly iv = Buffer.from('1234567890123456', 'utf8');

    constructor(configService: ConfigService) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('La variable de entorno JWT_SECRET no está configurada');
        }
        // Garantiza que la clave tenga exactamente 32 bytes (256 bits) mediante un hash SHA-256
        this.secretKey = crypto.createHash('sha256').update(secret).digest();
    }

    // Descifra texto codificado en Base64 a un objeto JavaScript
    private decrypt(encryptedText: string): unknown {
        const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, this.iv);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }

    // Cifra cualquier valor u objeto a Base64
    private encrypt(value: unknown): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, this.iv);
        let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }

    // Comprueba si el cuerpo recibido tiene la propiedad encrypted
    private hasEncryptedProperty(body: unknown): body is { encrypted: string } {
        return (
            typeof body === 'object' &&
            body !== null &&
            'encrypted' in body &&
            typeof (body as Record<string, unknown>).encrypted === 'string'
        );
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<{ encrypted: string }> {
        const request = context.switchToHttp().getRequest<Request>();

        // 1. Fase Pre-Handler: Descifrado del Request Body
        if (this.hasEncryptedProperty(request.body)) {
            try {
                request.body = this.decrypt(request.body.encrypted);
            } catch (error) {
                throw new BadRequestException(
                    `Payload cifrado inválido o clave corrupta: ${error instanceof Error ? error.message : ''}`,
                );
            }
        }

        // 2. Fase Post-Handler: Cifrado reactivo de la respuesta
        return next.handle().pipe(
            map((data: unknown) => {
                return {
                    encrypted: this.encrypt(data),
                };
            }),
        );
    }
}
