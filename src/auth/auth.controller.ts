import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica un barbero y retorna un token JWT',
  })
  @ApiBody({ type: LoginDto, description: 'Credenciales de login' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Iniciar sesión como superusuario',
    description: 'Autentica el superusuario y retorna un token JWT',
  })
  @ApiBody({ type: LoginDto, description: 'Credenciales de superusuario' })
  @ApiResponse({
    status: 200,
    description: 'Login de superusuario exitoso, retorna token JWT',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }
}
