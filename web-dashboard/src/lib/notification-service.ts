// Notification Service
// Handles email, SMS, and webhook notifications

import nodemailer from 'nodemailer';

export interface NotificationConfig {
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
    recipient: string;
  };
  sms: {
    enabled: boolean;
    twilio: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
    recipient: string;
  };
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
  };
}

export interface NotificationMessage {
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
}

export class NotificationService {
  private config: NotificationConfig;
  private emailTransporter: any = null;

  constructor() {
    this.config = {
      email: {
        enabled: !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD,
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          user: process.env.SMTP_USER || '',
          password: process.env.SMTP_PASSWORD || ''
        },
        recipient: process.env.NOTIFICATION_EMAIL || ''
      },
      sms: {
        enabled: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID || '',
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
        },
        recipient: process.env.NOTIFICATION_PHONE_NUMBER || ''
      },
      webhook: {
        enabled: !!process.env.ALERT_WEBHOOK_URL,
        url: process.env.ALERT_WEBHOOK_URL || '',
        secret: process.env.WEBHOOK_SECRET || ''
      }
    };

    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    if (this.config.email.enabled) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port,
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.config.email.smtp.user,
          pass: this.config.email.smtp.password
        }
      });
    }
  }

  async sendEmail(message: NotificationMessage): Promise<boolean> {
    if (!this.config.email.enabled || !this.emailTransporter) {
      console.log('Email notifications not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: this.config.email.smtp.user,
        to: this.config.email.recipient,
        subject: `[${message.priority.toUpperCase()}] ${message.subject}`,
        text: message.body,
        html: this.formatEmailHTML(message)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendSMS(message: NotificationMessage): Promise<boolean> {
    if (!this.config.sms.enabled) {
      console.log('SMS notifications not configured');
      return false;
    }

    try {
      // Using Twilio REST API
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.sms.twilio.accountSid}/Messages.json`;
      const credentials = Buffer.from(
        `${this.config.sms.twilio.accountSid}:${this.config.sms.twilio.authToken}`
      ).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: this.config.sms.recipient,
          From: this.config.sms.twilio.phoneNumber,
          Body: `[${message.priority.toUpperCase()}] ${message.subject}: ${message.body}`
        })
      });

      if (response.ok) {
        console.log('SMS sent successfully');
        return true;
      } else {
        console.error('SMS sending failed:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  async sendWebhook(message: NotificationMessage, alertData: any): Promise<boolean> {
    if (!this.config.webhook.enabled) {
      console.log('Webhook notifications not configured');
      return false;
    }

    try {
      const payload = {
        message,
        alert: alertData,
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(alertData)
      };

      const response = await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.config.webhook.secret
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Webhook sent successfully');
        return true;
      } else {
        console.error('Webhook sending failed:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      return false;
    }
  }

  async sendNotification(message: NotificationMessage, alertData: any): Promise<{
    email: boolean;
    sms: boolean;
    webhook: boolean;
  }> {
    const results = {
      email: false,
      sms: false,
      webhook: false
    };

    const promises = [];

    if (message.channels.includes('email') && this.config.email.enabled) {
      promises.push(
        this.sendEmail(message).then(success => { results.email = success; })
      );
    }

    if (message.channels.includes('sms') && this.config.sms.enabled) {
      promises.push(
        this.sendSMS(message).then(success => { results.sms = success; })
      );
    }

    if (message.channels.includes('webhook') && this.config.webhook.enabled) {
      promises.push(
        this.sendWebhook(message, alertData).then(success => { results.webhook = success; })
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  private formatEmailHTML(message: NotificationMessage): string {
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    const color = priorityColors[message.priority];

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${message.priority.toUpperCase()} ALERT</h2>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h3 style="margin-top: 0;">${message.subject}</h3>
          <p style="white-space: pre-wrap;">${message.body}</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p>Trade Alert System • ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }

  private generateSignature(data: any): string {
    // Simple signature generation (for production, use proper crypto library)
    const string = JSON.stringify(data) + this.config.webhook.secret;
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      const char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.email) {
      this.initializeEmailTransporter();
    }
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  testConfiguration(): {
    email: boolean;
    sms: boolean;
    webhook: boolean;
  } {
    return {
      email: this.config.email.enabled,
      sms: this.config.sms.enabled,
      webhook: this.config.webhook.enabled
    };
  }
}

export const notificationService = new NotificationService();