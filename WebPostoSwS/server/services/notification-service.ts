import { storage } from "../storage";
import type { Transaction } from "@shared/schema";

interface NotificationPayload {
  event: string;
  transactionId?: string;
  codigoVenda?: string;
  message: string;
  timestamp: string;
  details?: any;
}

class NotificationService {
  async sendNotification(event: string, message: string, transactionId?: string, details?: any) {
    const settings = await storage.getNotificationSettings();
    
    if (!settings) {
      return;
    }

    // Check if we should notify for this event
    const shouldNotify = this.shouldNotifyForEvent(settings, event);
    if (!shouldNotify) {
      return;
    }

    let transaction: Transaction | null = null;
    if (transactionId) {
      transaction = await storage.getTransaction(transactionId);
    }

    const payload: NotificationPayload = {
      event,
      transactionId,
      codigoVenda: transaction?.codigoVenda,
      message,
      timestamp: new Date().toISOString(),
      details,
    };

    // Send webhook notification
    if (settings.webhookEnabled && settings.webhookUrl) {
      await this.sendWebhook(settings.webhookUrl, payload, transactionId);
    }

    // Send email notification
    if (settings.emailEnabled && settings.emailRecipients) {
      const recipients = settings.emailRecipients.split(',').map(e => e.trim());
      for (const recipient of recipients) {
        await this.sendEmail(recipient, payload, transactionId);
      }
    }
  }

  private shouldNotifyForEvent(settings: any, event: string): boolean {
    if (event === 'retry_failed' && settings.notifyOnRetryFailed) {
      return true;
    }
    if (event === 'sws_error' && settings.notifyOnSwsError) {
      return true;
    }
    if (event === 'webposto_error' && settings.notifyOnWebpostoError) {
      return true;
    }
    return false;
  }

  private async sendWebhook(url: string, payload: NotificationPayload, transactionId?: string) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      await storage.createNotificationHistory({
        transactionId: transactionId || null,
        type: 'webhook',
        recipient: url,
        event: payload.event,
        message: payload.message,
        payload: payload as any,
        status: response.ok ? 'sent' : 'failed',
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
      });

      await storage.createLog({
        level: response.ok ? 'info' : 'warning',
        source: 'system',
        action: 'notification',
        message: `Webhook notification ${response.ok ? 'sent' : 'failed'}: ${payload.event}`,
        details: { url, status: response.status },
        transactionId: transactionId || null,
      });
    } catch (error) {
      await storage.createNotificationHistory({
        transactionId: transactionId || null,
        type: 'webhook',
        recipient: url,
        event: payload.event,
        message: payload.message,
        payload: payload as any,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      await storage.createLog({
        level: 'error',
        source: 'system',
        action: 'notification',
        message: `Webhook notification failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { url, error: String(error) },
        transactionId: transactionId || null,
      });
    }
  }

  private async sendEmail(recipient: string, payload: NotificationPayload, transactionId?: string) {
    try {
      // For MVP, we'll just log the email notification
      // In production, integrate with SendGrid, AWS SES, etc.
      await storage.createNotificationHistory({
        transactionId: transactionId || null,
        type: 'email',
        recipient,
        event: payload.event,
        message: payload.message,
        payload: payload as any,
        status: 'sent',
        errorMessage: null,
      });

      await storage.createLog({
        level: 'info',
        source: 'system',
        action: 'notification',
        message: `Email notification logged for ${recipient}: ${payload.event}`,
        details: { recipient, event: payload.event },
        transactionId: transactionId || null,
      });
    } catch (error) {
      await storage.createNotificationHistory({
        transactionId: transactionId || null,
        type: 'email',
        recipient,
        event: payload.event,
        message: payload.message,
        payload: payload as any,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      await storage.createLog({
        level: 'error',
        source: 'system',
        action: 'notification',
        message: `Email notification failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { recipient, error: String(error) },
        transactionId: transactionId || null,
      });
    }
  }

  // Convenience methods for specific events
  async notifyRetryFailed(transactionId: string, error: string) {
    await this.sendNotification(
      'retry_failed',
      `Transaction retry failed after maximum attempts: ${error}`,
      transactionId,
      { error }
    );
  }

  async notifySwsError(transactionId: string, error: string) {
    await this.sendNotification(
      'sws_error',
      `SwS API error: ${error}`,
      transactionId,
      { error }
    );
  }

  async notifyWebpostoError(error: string, details?: any) {
    await this.sendNotification(
      'webposto_error',
      `WebPosto integration error: ${error}`,
      undefined,
      details
    );
  }
}

export const notificationService = new NotificationService();
