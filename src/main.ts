import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/helpers/exception';
import * as nodeCrypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

// Ensure global crypto is available for NestJS
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto });
}

// This is the correct type for Vercel handler
import type { Request, Response } from 'express';
import type { Express } from 'express';

let server: Express;

async function createApp() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('BitLenda API')
    .setVersion('1.0')
    .addServer(process.env.BASE_URL || 'http://localhost:3000')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();

  await app.init();
  return app;
}

// Local development mode (starts a normal server)
if (process.env.VERCEL !== 'true') {
  createApp().then(async (app) => {
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`App running on http://localhost:${port}`);
  });
}

// Serverless export for Vercel
export default async function handler(req: Request, res: Response) {
  if (!server) {
    const app = await createApp();
    // 👇 this returns the Express instance that can handle (req,res)
    server = app.getHttpAdapter().getInstance();
  }

  // now TypeScript knows this is callable
  return server(req, res);
}
