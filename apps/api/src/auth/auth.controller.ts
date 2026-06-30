import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { RequestWithTenant } from '../common/types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
// Throttle credential endpoints per-IP to blunt brute-force / signup spam.
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private ctx(req: RequestWithTenant) {
    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Salon signup — creates tenant, owner & trial' })
  register(@Body() dto: RegisterDto, @Req() req: RequestWithTenant) {
    return this.auth.register(dto, this.ctx(req));
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  login(@Body() dto: LoginDto, @Req() req: RequestWithTenant) {
    return this.auth.login(dto, req.tenant?.slug, this.ctx(req));
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token, get a new token pair' })
  refresh(@Body() dto: RefreshDto, @Req() req: RequestWithTenant) {
    return this.auth.refresh(dto.refreshToken, this.ctx(req));
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }
}
