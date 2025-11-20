// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import {
//   S3Client,
//   DeleteObjectCommand,
//   CreateBucketCommand,
//   HeadBucketCommand,
// } from '@aws-sdk/client-s3';

// @Injectable()
// export class AwsService {
//   private s3: S3Client;
//   private region: string;
//   private accessKeyId: string;
//   private secretAccessKey: string;
//   private bucket: string;

//   constructor() {
//     this.region = process.env.AWS_REGION;
//     this.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
//     this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
//     this.bucket = process.env.AWS_S3_BUCKET;

//     this.s3 = new S3Client({
//       region: process.env.AWS_REGION,
//       credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       },
//     });
//   }

//   async getClient(): Promise<S3Client> {
//     await this.ensureBucketExists();
//     return this.s3;
//   }

//   async deleteFile(key: string) {
//     await this.s3.send(
//       new DeleteObjectCommand({
//         Bucket: process.env.AWS_BUCKET_NAME,
//         Key: key,
//       }),
//     );
//     return { deleted: true };
//   }

//   async createBucket(bucketName: string) {
//     try {
//       const command = new CreateBucketCommand({
//         Bucket: bucketName,
//         CreateBucketConfiguration: {
//           // LocationConstraint: this.region, //  same as region
//         },
//       });

//       await this.s3.send(command);
//       console.log(` Bucket "${bucketName}" created successfully`);
//       return { created: true, bucket: bucketName };
//     } catch (error) {
//       if (error.name === 'BucketAlreadyOwnedByYou') {
//         console.log(`Bucket "${bucketName}" already exists`);
//         return { created: false, message: 'Bucket already exists' };
//       }
//       console.error(' Error creating bucket:', error);
//       throw new InternalServerErrorException('Could not create bucket');
//     }
//   }

//   private async ensureBucketExists() {
//     try {
//       await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
//     } catch (error) {
//       if (
//         error.name === 'NotFound' ||
//         error.$metadata?.httpStatusCode === 404
//       ) {
//         console.log(` Creating new bucket: ${this.bucket}`);
//         await this.s3.send(
//           new CreateBucketCommand({
//             Bucket: this.bucket,
//             ACL: 'private',
//           }),
//         );
//       } else {
//         console.error(' Bucket check error:', error);
//         throw new InternalServerErrorException('S3 bucket validation failed');
//       }
//     }
//   }
// }
