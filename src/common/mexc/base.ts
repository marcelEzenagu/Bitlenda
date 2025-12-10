import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
import HmacSHA256 from 'crypto-js/hmac-sha256';

import {
  removeEmptyValue,
  buildQueryString,
  createRequest,
  defaultLogger,
} from './helpers/utils';

interface APIBaseOptions {
  apiKey: string;
  apiSecret: string;
  baseURL: string;
  logger?: any;
}

@Injectable()
export class APIBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseURL: string;
  private readonly logger: any;

  constructor(options: APIBaseOptions) {
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.baseURL = options.baseURL;
    this.logger = options.logger ?? defaultLogger;
  }

  publicRequest(
    method: string,
    path: string,
    params: Record<string, any> = {},
  ) {
    const cleanParams = removeEmptyValue(params);
    const query = buildQueryString(cleanParams);

    const finalUrl = query ? `${path}?${query}` : path;

    return createRequest({
      method,
      baseURL: this.baseURL,
      url: finalUrl,
      apiKey: this.apiKey,
    });
  }

  signRequest(method: string, path: string, params: Record<string, any> = {}) {
    try {
      const cleanParams = removeEmptyValue(params);
      const timestamp = Date.now();

      let queryString = buildQueryString({
        ...cleanParams,
        timestamp,
      });

      // Encode special characters for MEXC
      queryString = queryString.replace(/\(/g, '%28').replace(/\)/g, '%29');

      const signature = CryptoJS.enc.Hex.stringify(
        CryptoJS.HmacSHA256(queryString, this.apiSecret),
      );

      const url = `${path}?${queryString}&signature=${signature}`;

      return createRequest({
        method,
        baseURL: this.baseURL,
        url,
        apiKey: this.apiKey,
      });
    } catch (error: any) {
      console.log('ERROR: ', error);
      throw new Error(error?.message || 'Signing request failed');
    }
  }
}
