import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AccessTokenMiddleware } from 'src/common/middleware/auth.middleware';
import { AuthModule } from 'src/auth/auth.module';
import { MexcAssignMiddleware } from 'src/common/middleware/mexc.middleware';
import { LoansModule } from 'src/loans/loans.module';
import { WithdrawalModule } from 'src/withdrawal/withdrawal.module';
import { RedisService } from 'src/common/redis.service';
import { EmailService } from 'src/common/email.service';
import { MexcService } from 'src/common/mexc/mexc.service';

@Module({
  imports: [forwardRef(() => AuthModule), LoansModule, WithdrawalModule],
  controllers: [UserController],
  providers: [UserService, RedisService, EmailService, MexcService],
  exports: [UserService],
})
export class UserModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware)
      // .exclude({ path: , method: RequestMethod.POST })
      .forRoutes(UserController);
    consumer.apply(MexcAssignMiddleware).forRoutes(
      { path: 'users/verify', method: RequestMethod.POST },
      { path: 'users/request-loan', method: RequestMethod.POST },
      { path: 'users/get-loan-address', method: RequestMethod.POST },
      { path: 'users/take-loan', method: RequestMethod.POST },
      { path: 'users/withdraw-confirm', method: RequestMethod.POST },
      // add more routes here...
    );
  }
}
