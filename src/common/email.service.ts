import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import * as formData from 'form-data';
import Mailgun from 'mailgun.js';
@Injectable()
export class EmailService {
  private mailgunClient: any;
  private emailAPI: any;
  constructor() {
    this.emailAPI = new TransactionalEmailsApi();
    this.emailAPI.authentications.apiKey.apiKey = process.env.BREVO_KEY;
    // ('xkeysib-xxxxxxxxxxxxxxxxxxxxx');

    // const mailgun = new Mailgun(formData);
    // this.mailgunClient = mailgun.client({
    //   username: 'api',
    //   key: process.env.MAILGUN_SECRET_KEY,
    // });
  }

  async sendVerificationEmail(email: string, otp: string): Promise<void> {
    let message = new SendSmtpEmail();

    try {
      message.sender = {
        name: process.env.EMAIL_ACCOUNT_NAME,
        email: process.env.EMAIL_ACCOUNT,
      };
      message.to = [{ email }];
      message.subject = 'Verify Your Email';
      message.htmlContent = `
          <html>
            <body>
              <h1>Bitlenda Email Verification</h1>
                <p>
              Hello,   
              Welcome to Bitlenda,
              Your Verification code: 
              <h2>${otp}</h2>

              You recently tried to get your Bitlenda account. As a security manner, you will need this verification to access your account.
                </p>
            </body>
          </html>`;
      this.emailAPI.sendTransacEmail(message);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Email could not be sent');
    }
  }

  async sendMail({ to, subject, text }): Promise<void> {
    try {
      let message = new SendSmtpEmail();

      message.sender = {
        name: process.env.EMAIL_ACCOUNT_NAME,
        email: process.env.EMAIL_ACCOUNT,
      };
      message.to = [{ email: to }];
      message.subject = subject;
      message.textContent = text;

      this.emailAPI.sendTransacEmail(message);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new InternalServerErrorException('Email could not be sent');
    }
  }
}
