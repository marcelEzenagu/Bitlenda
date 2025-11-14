import * as nodeCrypto from 'crypto';

// Ensure globalThis.crypto exists for NestJS Scheduler (Node 18+ compatibility)
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto,
  });
}
import * as dotenv from 'dotenv';

dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/helpers/exception';

import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
      .setTitle('BitLenda API')
      .setVersion('1.0')
      .addServer(process.env.BASE_URL, 'Live environment')
      .addBearerAuth(
        {
          description: `Please enter token in this format: Bearer <access-token>`,
          name: 'Authorization',
          bearerFormat: 'Bearer ',
          scheme: 'Bearer',
          type: 'http',
          in: 'Header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT;

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true, // transform payloads to DTO instances
        whitelist: true, // strip out unrecognized props
        transformOptions: {
          enableImplicitConversion: true, //this converts "true"/"false" -> boolean
        },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    await app.listen(port);
    console.log(`App is running on http://localhost:${port}`);
  } catch (e) {
    console.log('BOOT_STRAP error: ', e);
  }
}
bootstrap();
