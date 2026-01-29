import {
  BadGatewayException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class WithdrawalMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req, res, next) {
    const userID = req.claims.userID;
    const user = await this.userService.findById(userID);

    if (!user.bvn && !user.bvn_verified_at) {
      throw new BadGatewayException('complete regulatory verification');
    }

    next();
  }
}
