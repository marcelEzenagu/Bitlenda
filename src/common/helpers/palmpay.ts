import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as md5 from 'md5';

@Injectable()
export class PalmPayService {
  /**
   * Sorts params alphabetically, removes null/undefined/empty values,
   * excludes the `sign` field, and returns them as a query string.
   */
  sortParams(body: Record<string, any>): string {
    return Object.keys(body)
      .sort()
      .filter(
        (key) =>
          key !== 'sign' &&
          body[key] !== undefined &&
          body[key] !== null &&
          body[key] !== '',
      )
      .map((key) => `${key}=${body[key]}`)
      .join('&');
  }

  /**
   * Builds the message digest (MD5 hash in uppercase).
   */
  buildDigest(body: Record<string, any>): string {
    const sortedParameters = this.sortParams(body);
    const md5Hash = md5(sortedParameters).toUpperCase();
    return md5Hash;
  }

  /**
   * Generate an RSA-SHA1 signature from request body.
   */
  generateSignature(
    requestBody: Record<string, any>,
    privateKeyPEM: string,
  ): string {
    if (!privateKeyPEM) {
      throw new Error('Private key is required');
    }

    const digest = this.buildDigest(requestBody);

    const signer = crypto.createSign('RSA-SHA1');
    signer.update(digest);
    signer.end();

    return signer.sign(privateKeyPEM, 'base64');
  }

  /**
   * Verify RSA-SHA1 signature.
   */
  verifySignature(
    requestBody: Record<string, any>,
    publicKeyPEM: string,
  ): boolean {
    if (!publicKeyPEM) {
      throw new Error('Public key is required');
    }

    if (!requestBody.sign) {
      throw new Error('Signature (`sign`) is missing from request body');
    }

    const digest = this.buildDigest(requestBody);
    const signature = decodeURIComponent(requestBody.sign);

    const verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(digest);
    verifier.end();

    return verifier.verify(publicKeyPEM, signature, 'base64');
  }
}
