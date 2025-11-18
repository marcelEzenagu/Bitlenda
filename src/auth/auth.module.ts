import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { EmailService } from 'src/common/email.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis.service';
import { UserService } from 'src/user/user.service';
import { AccessTokenMiddleware } from 'src/common/middleware/auth.middleware';
import { ErrorFormat } from 'src/common/helpers/errorFormat';
import { MongooseModule } from '@nestjs/mongoose';
import { BiometricsController } from './biometrics.controller';
import { BiometricsService } from './biometrics.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: `${process.env.JWT_SECRET}`,
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController, BiometricsController],
  providers: [
    AuthService,
    BiometricsService,
    ErrorFormat,
    EmailService,
    RedisService,
    ErrorFormat,
    AccessTokenMiddleware,
  ],
  exports: [AuthService],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware)
      .forRoutes({ path: 'auth/logout', method: RequestMethod.GET });
  }
}
