import { Injectable, InternalServerErrorException } from '@nestjs/common';

import * as formData from 'form-data';
import Mailgun from 'mailgun.js';
@Injectable()
export class EmailService {
  private mailgunClient: any;

  constructor() {
    const mailgun = new Mailgun(formData);
    this.mailgunClient = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_KEY,
      url: 'https://api.mailgun.net',
    });
  }

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    try {
      const domain = process.env.MAILGUN_DOMAIN;
      const mailer = process.env.MAILGUN_FROM_EMAIL;

      return this.mailgunClient.messages.create(domain, {
        from: `Bitlenda <${mailer}>`,
        to: email,
        subject: 'Verify Your Email',
        html: `
          <html>
            <body>
              <h1>Bitlenda Email Verification</h1>
                <p>
              Dear User,   
              Your Verification code: 
              <h2>${otp}</h2>

              You recently tried to get your Bitlenda account. As a security manner, you will need this verification to access your account.
                </p>
            </body>
          </html>`,
        text: '',
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Email could not be sent');
    }
  }
  async sendWithdrawalEmail(
    email: string,
    otp: string,
    withdrawalVersion: string,
  ): Promise<void> {
    try {
      const domain = process.env.MAILGUN_DOMAIN;
      const mailer = process.env.MAILGUN_FROM_EMAIL;

      return this.mailgunClient.messages.create(domain, {
        from: `Bitlenda <${mailer}>`,
        to: email,
        subject: `Verify Your ${withdrawalVersion}`,
        html: `
          <html>
            <body>
              <h1>Bitlenda ${withdrawalVersion} Verification</h1>
                <p>
              Dear User,   
              Your Verification code: 
              <h2>${otp}</h2>

              You recently tried ${withdrawalVersion}. As a security measure, you will need this verification to access your account.
                </p>
            </body>
          </html>`,
        text: '',
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Email could not be sent');
    }
  }

  async sendMail({ to, subject, text }): Promise<void> {
    try {
      const domain = process.env.MAILGUN_DOMAIN;
      return this.mailgunClient.messages.create(domain, {
        from: `"Bitlenda " <${process.env.MAILGUN_FROM_EMAIL}>`,
        to,
        subject,
        text,
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Email could not be sent');
    }
  }
}
