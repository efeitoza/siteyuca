import { storage } from "../storage";
import { swsClient } from "./sws-client";
import { notificationService } from "./notification-service";

interface RetryJob {
  transactionId: string;
  attempts: number;
  nextRetry: number;
}

class RetryQueue {
  private queue: Map<string, RetryJob> = new Map();
  private processing: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [30000, 60000, 300000]; // 30s, 1min, 5min

  async addToQueue(transactionId: string) {
    if (!this.queue.has(transactionId)) {
      this.queue.set(transactionId, {
        transactionId,
        attempts: 0,
        nextRetry: Date.now(),
      });
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "retry_queue",
        message: `Transaction ${transactionId} added to retry queue`,
        transactionId,
      });

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    }
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.size > 0) {
      const now = Date.now();
      
      for (const [id, job] of this.queue.entries()) {
        if (job.nextRetry <= now) {
          await this.processJob(job);
        }
      }

      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    this.processing = false;
  }

  private async processJob(job: RetryJob) {
    try {
      const transaction = await storage.getTransaction(job.transactionId);
      
      if (!transaction) {
        this.queue.delete(job.transactionId);
        return;
      }

      // Skip if already successfully sent
      if (transaction.status === "sent") {
        this.queue.delete(job.transactionId);
        return;
      }

      await storage.createLog({
        level: "info",
        source: "system",
        action: "retry_attempt",
        message: `Retrying SwS send for transaction ${transaction.codigoVenda} (attempt ${job.attempts + 1}/${this.MAX_RETRIES})`,
        transactionId: job.transactionId,
      });

      // Get products
      const products = await storage.getTransactionProducts(job.transactionId);
      
      // Attempt to send to SwS
      await swsClient.sendSale(transaction, products);
      
      // Success - remove from queue
      this.queue.delete(job.transactionId);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "retry_success",
        message: `Transaction ${transaction.codigoVenda} successfully sent to SwS on retry attempt ${job.attempts + 1}`,
        transactionId: job.transactionId,
      });

    } catch (error) {
      job.attempts++;
      
      if (job.attempts >= this.MAX_RETRIES) {
        // Max retries reached
        this.queue.delete(job.transactionId);
        
        const errorMessage = `Max retry attempts reached: ${error instanceof Error ? error.message : String(error)}`;
        
        await storage.updateTransaction(job.transactionId, {
          status: "failed",
          errorMessage,
        });
        
        await storage.createLog({
          level: "error",
          source: "system",
          action: "retry_failed",
          message: `Transaction failed after ${this.MAX_RETRIES} retry attempts`,
          details: { error: String(error) },
          transactionId: job.transactionId,
        });

        // Send notification for retry failure
        await notificationService.notifyRetryFailed(job.transactionId, errorMessage);
      } else {
        // Schedule next retry
        const delay = this.RETRY_DELAYS[job.attempts - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        job.nextRetry = Date.now() + delay;
        
        await storage.createLog({
          level: "warning",
          source: "system",
          action: "retry_scheduled",
          message: `Retry scheduled in ${delay/1000}s (attempt ${job.attempts}/${this.MAX_RETRIES})`,
          details: { error: String(error) },
          transactionId: job.transactionId,
        });
      }
    }
  }
}

export const retryQueue = new RetryQueue();
