import { Injectable, NestMiddleware } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class MexcAssignMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req, res, next) {
    const userID = req.claims.userID;
    const user = await this.userService.findById(userID);

    const mexc = await this.userService.assignOrReturnMexcDetails(user);

    req.user = mexc.user;
    req.mexcClient = {
      apiKey: mexc.apiKey,
      apiSecret: mexc.secretKey,
      memo: mexc.memo,
    };

    next();
  }
}
