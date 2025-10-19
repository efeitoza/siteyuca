import type { 
  SwSTokenRequest, 
  SwSTokenResponse, 
  SwSSaleRequest,
  Configuration,
  Transaction,
  TransactionProduct,
} from "@shared/schema";
import { storage } from "../storage";

export class SwSClient {
  private config: Configuration | null = null;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  async initialize() {
    const config = await storage.getConfiguration();
    this.config = config || null;
    if (!this.config) {
      throw new Error("SwS configuration not found");
    }
  }

  private async ensureConfig() {
    if (!this.config) {
      await this.initialize();
    }
    if (!this.config) {
      throw new Error("SwS configuration not available");
    }
  }

  async getToken(): Promise<string> {
    await this.ensureConfig();
    
    // Return cached token if still valid (tokens typically valid for 1 hour)
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    const tokenRequest: SwSTokenRequest = {
      terminalID: this.config!.swsTerminalId!,
      acquirerID: this.config!.swsAcquirerId!,
      language: "en",
      password: this.config!.swsPassword!,
    };

    await storage.createLog({
      level: "info",
      source: "sws",
      action: "create_token",
      message: "Requesting SwS authentication token",
      details: { terminalID: tokenRequest.terminalID },
    });

    try {
      const response = await fetch(`${this.config!.swsHost}/createtoken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SwS token request failed: ${response.status} - ${errorText}`);
      }

      const data: SwSTokenResponse = await response.json();
      this.cachedToken = data.token;
      this.tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 minutes

      await storage.createLog({
        level: "info",
        source: "sws",
        action: "create_token",
        message: "SwS token obtained successfully",
      });

      return data.token;
    } catch (error) {
      await storage.createLog({
        level: "error",
        source: "sws",
        action: "create_token",
        message: `Failed to obtain SwS token: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error) },
      });
      throw error;
    }
  }

  private async applyFieldMappings(sourceData: any, entityType: string): Promise<any> {
    const mappings = await storage.getActiveFieldMappings(entityType);
    const result: any = {};

    for (const mapping of mappings) {
      let value: any;

      switch (mapping.mappingType) {
        case "fixed":
          value = mapping.fixedValue;
          break;
        
        case "direct":
          value = mapping.sourceField ? sourceData[mapping.sourceField] : undefined;
          break;
        
        case "multiply_100":
          value = mapping.sourceField ? parseFloat(sourceData[mapping.sourceField] || "0") * 100 : 0;
          break;
        
        case "multiply_1000":
          value = mapping.sourceField ? parseFloat(sourceData[mapping.sourceField] || "0") * 1000 : 0;
          break;
        
        default:
          value = mapping.sourceField ? sourceData[mapping.sourceField] : undefined;
      }

      result[mapping.targetField] = value;
    }

    return result;
  }

  async validateVoucher(transaction: Transaction): Promise<any> {
    // Build validate request FIRST (before any operation that can fail)
    let validateRequest: any = {
      actionType: "3",
      terminalID: "unknown",
      acquirerID: "unknown",
      created: new Date().toISOString(),
      clientID: transaction.codigoVoucher || "unknown",
    };

    try {
      await this.ensureConfig();
      const token = await this.getToken();

      // Get validate field mappings
      const validateMappings = await storage.getActiveFieldMappings("validate");
      
      // Update validate request with actual config
      validateRequest = {
        actionType: "3",
        terminalID: this.config!.swsTerminalId!,
        acquirerID: this.config!.swsAcquirerId!,
        created: new Date().toISOString(),
        clientID: transaction.codigoVoucher,
      };

      // Apply validate-level field mappings if configured
      if (validateMappings.length > 0) {
        for (const mapping of validateMappings) {
          let value: any;
          switch (mapping.mappingType) {
            case "fixed":
              value = mapping.fixedValue || "";
              break;
            case "direct":
              value = mapping.sourceField ? (transaction as any)[mapping.sourceField] || mapping.defaultValue || "" : mapping.defaultValue || "";
              break;
            case "multiply_100":
              const val100 = mapping.sourceField ? parseFloat((transaction as any)[mapping.sourceField]?.toString() || mapping.defaultValue || "0") : parseFloat(mapping.defaultValue || "0");
              value = Math.round(val100 * 100).toString();
              break;
            case "multiply_1000":
              const val1000 = mapping.sourceField ? parseFloat((transaction as any)[mapping.sourceField]?.toString() || mapping.defaultValue || "0") : parseFloat(mapping.defaultValue || "0");
              value = Math.round(val1000 * 1000).toString();
              break;
            default:
              value = mapping.sourceField ? (transaction as any)[mapping.sourceField] || mapping.defaultValue || "" : mapping.defaultValue || "";
          }
          validateRequest[mapping.targetField] = typeof value === 'string' ? value : String(value);
        }
      }

      await storage.createLog({
        level: "info",
        source: "sws",
        action: "validate_voucher",
        message: `Validating voucher with SwS: ${transaction.codigoVenda}`,
        details: { validateRequest },
        transactionId: transaction.id,
      });

      const response = await fetch(`${this.config!.swsHost}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(validateRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SwS validate request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      await storage.createLog({
        level: "info",
        source: "sws",
        action: "validate_voucher",
        message: `Voucher validated successfully with SwS: ${transaction.codigoVenda}`,
        details: { result },
        transactionId: transaction.id,
      });

      // Return both request and response for debugging
      return {
        request: validateRequest,
        response: result
      };
    } catch (error) {
      await storage.createLog({
        level: "error",
        source: "sws",
        action: "validate_voucher",
        message: `Failed to validate voucher with SwS: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error), validateRequest },
        transactionId: transaction.id,
      });
      // Return request even on error for didactic flow visualization
      return {
        request: validateRequest,
        response: {
          error: true,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorDetails: "SwS API call failed - check credentials in /settings"
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async sendSale(transaction: Transaction, products: TransactionProduct[]): Promise<any> {
    await this.ensureConfig();
    const token = await this.getToken();

    // Generate RRN timestamp (Retrieval Reference Number)
    const rrn = Date.now().toString();
    
    // Get field mappings for all entity types
    const productMappings = await storage.getActiveFieldMappings("product");
    const transactionMappings = await storage.getActiveFieldMappings("transaction");
    
    // Map WebPosto products to SwS format using field mappings
    const swsProducts = products.map((product) => {
      if (productMappings.length > 0) {
        // Use dynamic field mappings with already fetched mappings
        const result: any = {};
        for (const mapping of productMappings) {
          let value: any;
          switch (mapping.mappingType) {
            case "fixed":
              value = mapping.fixedValue || "";
              break;
            case "direct":
              value = product[mapping.sourceField as keyof typeof product] || mapping.defaultValue || "";
              break;
            case "multiply_100":
              const val100 = parseFloat(product[mapping.sourceField as keyof typeof product]?.toString() || mapping.defaultValue || "0");
              value = Math.round(val100 * 100).toString();
              break;
            case "multiply_1000":
              const val1000 = parseFloat(product[mapping.sourceField as keyof typeof product]?.toString() || mapping.defaultValue || "0");
              value = Math.round(val1000 * 1000).toString();
              break;
            default:
              value = product[mapping.sourceField as keyof typeof product] || mapping.defaultValue || "";
          }
          // Convert value to string for SwS API
          result[mapping.targetField] = typeof value === 'string' ? value : String(value);
        }
        return result;
      } else {
        // Fallback to default mapping if no field mappings configured
        return {
          name: product.nomeProduto,
          productId: product.codigoProduto,
          pCost: this.formatAmount(product.swsPCost || product.valorUnitario),
          price: this.formatAmount(product.valorUnitario),
          quantity: this.formatQuantity(product.quantidade),
          markupDiscount: "0",
          tax: product.swsTax || "20",
          barcode: product.swsBarcode || product.codigoProduto,
          group: product.swsGroup || "default",
          flag: "",
        };
      }
    });

    // Calculate total amount and cost for use in mappings
    const totalAmount = products.reduce((sum, p) => 
      sum + (parseFloat(p.valorVenda.toString()) * 100), 0
    );
    
    const totalPCost = products.reduce((sum, p) => 
      sum + (parseFloat((p.swsPCost || p.valorUnitario).toString()) * parseFloat(p.quantidade.toString())), 0
    );

    // Prepare transaction data source for mappings
    const transactionSource = {
      ...transaction,
      rrn: rrn,
      totalAmount: Math.round(totalAmount).toString(),
      totalPcost: Math.round(totalPCost * 100).toString(),
      created: new Date().toISOString(),
      authCode: this.generateAuthCode(),
    };

    // Build sale request with transaction mappings or defaults
    const saleRequest: any = {
      actionType: "4",
      terminalID: this.config!.swsTerminalId!,
      acquirerID: this.config!.swsAcquirerId!,
      created: transactionSource.created,
      clientID: this.config!.swsClientId!,
      rrn: rrn,
      totalAmount: Math.round(totalAmount).toString(),
      additionalData: {
        products: swsProducts,
        totalPcost: Math.round(totalPCost * 100).toString(),
      },
      currency: this.config!.swsCurrency || "643",
      authCode: transactionSource.authCode,
    };

    // Apply transaction-level field mappings if configured
    if (transactionMappings.length > 0) {
      for (const mapping of transactionMappings) {
        let value: any;
        switch (mapping.mappingType) {
          case "fixed":
            value = mapping.fixedValue || "";
            break;
          case "direct":
            value = mapping.sourceField ? (transactionSource as any)[mapping.sourceField] || mapping.defaultValue || "" : mapping.defaultValue || "";
            break;
          case "multiply_100":
            const val100 = mapping.sourceField ? parseFloat((transactionSource as any)[mapping.sourceField]?.toString() || mapping.defaultValue || "0") : parseFloat(mapping.defaultValue || "0");
            value = Math.round(val100 * 100).toString();
            break;
          case "multiply_1000":
            const val1000 = mapping.sourceField ? parseFloat((transactionSource as any)[mapping.sourceField]?.toString() || mapping.defaultValue || "0") : parseFloat(mapping.defaultValue || "0");
            value = Math.round(val1000 * 1000).toString();
            break;
          default:
            value = mapping.sourceField ? (transactionSource as any)[mapping.sourceField] || mapping.defaultValue || "" : mapping.defaultValue || "";
        }
        // Apply mapping to sale request (overrides defaults)
        saleRequest[mapping.targetField] = typeof value === 'string' ? value : String(value);
      }
    }

    await storage.createLog({
      level: "info",
      source: "sws",
      action: "send_sale",
      message: `Sending sale to SwS: ${transaction.codigoVenda}`,
      details: { saleRequest },
      transactionId: transaction.id,
    });

    try {
      const response = await fetch(`${this.config!.swsHost}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(saleRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SwS sale request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      await storage.createLog({
        level: "info",
        source: "sws",
        action: "send_sale",
        message: `Sale sent successfully to SwS: ${transaction.codigoVenda}`,
        details: { result },
        transactionId: transaction.id,
      });

      // Update transaction with SwS data
      await storage.updateTransaction(transaction.id, {
        swsStatus: result.status || "success",
        swsRrn: rrn,
        swsAuthCode: saleRequest.authCode,
        swsData: saleRequest as any,
        status: "sent",
      });

      // Return both request and response for debugging
      return {
        request: saleRequest,
        response: result
      };
    } catch (error) {
      await storage.createLog({
        level: "error",
        source: "sws",
        action: "send_sale",
        message: `Failed to send sale to SwS: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error) },
        transactionId: transaction.id,
      });

      // Update transaction with error
      await storage.updateTransaction(transaction.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        retryCount: (transaction.retryCount || 0) + 1,
      });

      // Return request even on error for didactic flow visualization
      return {
        request: saleRequest,
        response: {
          error: true,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorDetails: "SwS API call failed - check credentials in /settings"
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private formatAmount(value: any): string {
    // Convert to cents/kopeks (multiply by 100)
    return Math.round(parseFloat(value.toString()) * 100).toString();
  }

  private formatQuantity(value: any): string {
    // Convert quantity to integer with 3 decimal precision (* 1000)
    return Math.round(parseFloat(value.toString()) * 1000).toString();
  }

  private generateAuthCode(): string {
    // Generate a random auth code (6 alphanumeric characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getToken();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }
}

export const swsClient = new SwSClient();
