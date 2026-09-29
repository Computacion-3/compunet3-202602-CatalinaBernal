import { Body, Controller, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';


import { CryptoInterceptor } from '../common/interceptors/crypto.interceptor';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthService } from './auth.service';

@UseInterceptors(CryptoInterceptor)
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: UserLoginDto) {
        return this.authService.login(loginDto);
    }
}
