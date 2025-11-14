// // src/users/schemas/user.schema.ts

import { RoleName } from './role.entity';

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';
// import * as bcrypt from 'bcrypt';
// import { RoleName } from './role.entity';

// export type UserDocument = User &
//   Document & {
//     id: string;
//   };

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

// export enum Gender {
//   MALE = 'MALE',
//   FEMALE = 'FEMALE',
//   OTHERS = 'OTHERS',
// }

// @Schema({
//   toJSON: {
//     getters: true,
//     virtuals: true,
//     transform: (doc, ret) => {
//       delete ret._id;
//       delete ret.__v;
//       return ret;
//     },
//   },
//   timestamps: true,
// })
// export class User {
//   @Prop({ type: String, lowercase: true, trim: true })
//   firstName: string;
//   @Prop({ type: String, lowercase: true, trim: true })
//   lastName: string;

//   @Prop({
//     type: String,
//     enum: RoleName,
//     default: RoleName.USER,
//   })
//   role: RoleName;

//   @Prop({ type: String, lowercase: true, trim: true })
//   email: string;

//   @Prop({ type: String })
//   password: string;

//   @Prop({ type: Boolean, default: false })
//   isEmailVerified: boolean;
//   @Prop({
//     type: String,
//     enum: UserStatus,
//     default: UserStatus.PENDING,
//   })
//   status: UserStatus;

//   @Prop({ type: String, required: false })
//   profilePicture?: string;

//   @Prop({ type: Date, default: null })
//   deletedAt?: Date;

//   @Prop({ type: Date, default: null })
//   lastActive?: Date;

//   @Prop({ type: Number, default: 0 })
//   tokenVersion: number;

//   @Prop({ type: String, enum: Gender, required: false })
//   gender?: Gender;

//   @Prop({ type: Date, default: null })
//   lastLogin?: Date;
// }

// // Create schema
// export const UserSchema = SchemaFactory.createForClass(User);

// // Hash password before saving
// UserSchema.pre<UserDocument>('save', async function (next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// // Exclude password from outputs (manual approach)
// UserSchema.set('toJSON', {
//   transform: (_doc, ret) => {
//     delete ret.password;
//     delete ret._id;
//     return ret;
//   },
// });

// UserSchema.virtual('id').get(function (this: UserDocument) {
//   return (this._id as Types.ObjectId).toHexString();
// });

// UserSchema.index({ phoneCode: 1, phone: 1 }, { unique: true });

// // ⚡ Indexes for performance
// UserSchema.index({ role: 1 });
// UserSchema.index({ status: 1 });
// UserSchema.index({ createdAt: -1 });
// UserSchema.index({ lastActive: -1 });
// UserSchema.index(
//   { fullName: 'text', email: 'text' },
//   { weights: { email: 5, fullName: 3 }, name: 'UserTextSearchIndex' },
// );
export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_verified?: boolean;
  status?: string;
  token_version?: number;
  created_at?: Date;
  role: RoleName;
  last_login: Date;
}
