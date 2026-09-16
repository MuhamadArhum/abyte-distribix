import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * Re-checks the user against the DB on every request instead of trusting
   * the JWT payload's role/status forever — otherwise deactivating a user
   * (or changing their role) has no effect until their token naturally
   * expires (up to 7 days later).
   */
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
