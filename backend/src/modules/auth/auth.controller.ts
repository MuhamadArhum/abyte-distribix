import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter than the app-wide default (100/min): login is the one endpoint
  // that's brute-forceable at network speed, so it gets its own limit.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('seed')
  async seed() {
    const result = await this.authService.seedAdmin();
    return { message: result.seeded ? 'Default admin created' : 'No-op: users already exist', ...result };
  }

  @Post('seed-super-admin')
  async seedSuperAdmin() {
    const result = await this.authService.seedSuperAdmin();
    return { message: result.seeded ? 'Super-admin created' : 'No-op: a super-admin already exists', ...result };
  }
}
