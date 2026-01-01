import * as crypto from 'crypto';
import { WithdrawDto } from 'src/withdrawal/dto/withdrawal.dto';

export class HelperUtils {
  /**
   * Parse a date string in d/m/yyyy format into a JS Date object
   * Example: "12/02/2024" → 12 Feb 2024
   */
  static parseDate(dateStr: string, isEnd = false): Date | null {
    if (!dateStr) return null;

    const [day, month, year] = dateStr.split(/[\/.-]/).map(Number);
    if (!day || !month || !year) return null;

    if (isEnd) {
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
  }

  static generateReferenceNo() {
    let text = '';
    let possible = 'ABDEFGHIJLMNOPTUVWXYZ01236789';
    for (let i = 0; i < 16; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }

  static hashToken(token: string): string {
    return crypto
      .createHmac('sha256', process.env.OTP_SECRET as string)
      .update(token)
      .digest('hex');
  }

  static verifyToken(token: string, hash: string): boolean {
    const computed = HelperUtils.hashToken(token);

    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(hash, 'hex'),
    );
  }

  static buildWithdrawIntent(dto: WithdrawDto) {
    return {
      withdrawType: String(dto.withdrawType),
      amount: Number(dto.amount),
      asset: dto.asset ?? '',
      address: dto.address ?? '',
    };
  }
}
