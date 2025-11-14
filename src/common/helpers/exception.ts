// all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = 500;
    let message = 'Internal server error';
    if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();
      message = (response as any).message || 'Bad request';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      message = exception.message || 'Error';
    }

    response.status(statusCode).json({
      statusCode,
      // timestamp: new Date().toISOString(),
      // path: request.url,
      message,
    });
  }
}
