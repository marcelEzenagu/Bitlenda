import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ErrorFormat {
  formatErrors(error: any) {
    if (error.name == 'MongoServerError') {
      const fields = Object.keys(error.keyPattern).map((key) => {
        const val = error.keyValue[key];
        return `${key}: ${val}`;
      });
      return `same combination of ${fields.join(', ')} already exists`;
    } else {
      const formattedErrors = [];
      if (error.errors != undefined) {
        for (const key in error.errors) {
          if (error.errors.hasOwnProperty(key)) {
            formattedErrors.push({
              field: key,
              message: error.errors[key].message,
            });
          }
        }
      } else {
        formattedErrors.push(error.message);
      }
      return formattedErrors.join(', ');
    }
  }
}
