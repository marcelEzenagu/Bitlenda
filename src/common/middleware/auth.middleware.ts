import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
  ConsoleLogger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../auth/auth.service';
import { Model, Types } from 'mongoose';
import { RoleName } from 'src/user/entities/role.entity';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AccessTokenMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    // For all other routes → require token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or malformed',
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header missing or malformed',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = await this.authService.verifyAccessToken(token);
      req['claims'] = decoded; // Store the decoded user information in the request object
      const requiredRoles = this.getRequiredRoles(req.path);

      if (decoded['type'] != 'onboarding') {
        if (requiredRoles && !requiredRoles.includes(decoded.role)) {
          throw new ForbiddenException(`Access denied.`);
        }
      }

      next();
    } catch (error) {
      console.log('error:: ', error);
      if (error.message) {
        throw error;
      } else {
        throw new UnauthorizedException('Invalid access token');
      }
    }
  }

  private getRequiredRoles(path: string): string[] | null {
    if (path.startsWith('/users')) {
      return [RoleName.USER];
    } else if (path.startsWith('/admins')) {
      // Admin routes accessible by multiple roles
      // allow both admin and super admin roles
      return [RoleName.ADMIN, RoleName.SUPER_ADMIN];
    }

    return null; // No specific role restriction
  }
}
