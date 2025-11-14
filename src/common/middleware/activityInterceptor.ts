// import {
//   Injectable,
//   NestInterceptor,
//   ExecutionContext,
//   CallHandler,
// } from '@nestjs/common';
// import { Observable } from 'rxjs';
// import { Model } from 'mongoose';
// import { InjectModel } from '@nestjs/mongoose';
// import { User } from 'src/user/entities/user.entity';

// @Injectable()
// export class LastActiveInterceptor implements NestInterceptor {
//   constructor(
//     @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
//   ) {}

//   async intercept(
//     context: ExecutionContext,
//     next: CallHandler,
//   ): Promise<Observable<any>> {
//     const request = context.switchToHttp().getRequest();
//     const user = request.user; // usually set by your JWT/Auth guard

//     if (user?.id) {
//       // update quietly, no await so it doesn’t block request
//       this.userModel
//         .findByIdAndUpdate(user.id, { lastActive: new Date() })
//         .catch(() => {});
//     }

//     return next.handle();
//   }
// }
