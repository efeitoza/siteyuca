import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { swsClient } from "./services/sws-client";
import { retryQueue } from "./services/retry-queue";
import type {
  WebPostoAuthRequest,
  WebPostoAuthResponse,
  WebPostoValidateRequest,
  WebPostoValidateResponse,
  WebPostoSendRequest,
  WebPostoCancelRequest,
  InsertConfiguration,
} from "@shared/schema";
import { insertNotificationSettingsSchema } from "@shared/schema";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration endpoints
  app.get("/api/configuration", async (req, res) => {
    try {
      const config = await storage.getConfiguration();
      
      if (!config) {
        return res.status(200).json({
          name: "default",
          webpostoUsuario: "",
          webpostoSenha: "",
          webpostoCodigoEmpresa: "",
          swsHost: "",
          swsTerminalId: "",
          swsAcquirerId: "",
          swsClientId: "",
          swsPassword: "",
          swsCurrency: "643",
          isActive: true,
        });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  app.post("/api/configuration", async (req, res) => {
    try {
      const configData: InsertConfiguration = req.body;
      const config = await storage.upsertConfiguration(configData);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "update_config",
        message: "Configuration updated successfully",
      });
      
      res.json(config);
    } catch (error) {
      console.error("Error saving configuration:", error);
      await storage.createLog({
        level: "error",
        source: "system",
        action: "update_config",
        message: `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`,
      });
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  app.post("/api/configuration/test/:type", async (req, res) => {
    try {
      const { type } = req.params;
      
      if (type === "sws") {
        const result = await swsClient.testConnection();
        if (result.success) {
          res.json({ success: true, message: "SwS connection successful" });
        } else {
          res.status(500).json({ success: false, error: result.error || "SwS connection failed" });
        }
      } else if (type === "webposto") {
        // For WebPosto, we just verify the configuration exists
        const config = await storage.getConfiguration();
        if (config && config.webpostoUsuario && config.webpostoSenha) {
          res.json({ success: true, message: "WebPosto configuration valid" });
        } else {
          res.status(500).json({ success: false, error: "WebPosto configuration incomplete" });
        }
      } else {
        res.status(400).json({ error: "Invalid test type" });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Connection test failed" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const recentTransactions = await storage.listTransactions(5);
      
      res.json({
        ...stats,
        recentTransactions,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.listTransactions(100);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Logs endpoints
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await storage.listLogs(200);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Notification Settings endpoints
  app.get("/api/notifications/settings", async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      
      if (!settings) {
        return res.status(200).json({
          webhookUrl: "",
          webhookEnabled: false,
          emailRecipients: "",
          emailEnabled: false,
          notifyOnRetryFailed: true,
          notifyOnSwsError: false,
          notifyOnWebpostoError: false,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  app.post("/api/notifications/settings", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertNotificationSettingsSchema.parse(req.body);
      
      // Additional validation: if webhook/email is enabled, require URL/recipients
      if (validatedData.webhookEnabled && !validatedData.webhookUrl) {
        return res.status(400).json({ error: "Webhook URL é obrigatória quando webhook está habilitado" });
      }
      
      if (validatedData.emailEnabled && !validatedData.emailRecipients) {
        return res.status(400).json({ error: "Destinatários de email são obrigatórios quando email está habilitado" });
      }
      
      const settings = await storage.upsertNotificationSettings(validatedData);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "update_notifications",
        message: "Notification settings updated successfully",
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save notification settings";
      res.status(400).json({ error: errorMessage });
    }
  });

  app.get("/api/notifications/history", async (req, res) => {
    try {
      const history = await storage.listNotificationHistory(100);
      res.json(history);
    } catch (error) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({ error: "Failed to fetch notification history" });
    }
  });

  // Analytics Endpoints
  app.get("/api/analytics/transactions-by-period", async (req, res) => {
    try {
      const { period = 'day', days = 30 } = req.query;
      const data = await storage.getTransactionsByPeriod(
        period as 'hour' | 'day' | 'week' | 'month',
        parseInt(days as string)
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching transactions by period:", error);
      res.status(500).json({ error: "Failed to fetch transactions by period" });
    }
  });

  app.get("/api/analytics/top-products", async (req, res) => {
    try {
      const { limit = 10, days = 30 } = req.query;
      const data = await storage.getTopProducts(
        parseInt(limit as string),
        parseInt(days as string)
      );
      res.json(data);
    } catch (error) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ error: "Failed to fetch top products" });
    }
  });

  app.get("/api/analytics/success-rate", async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const data = await storage.getSuccessRate(parseInt(days as string));
      res.json(data);
    } catch (error) {
      console.error("Error fetching success rate:", error);
      res.status(500).json({ error: "Failed to fetch success rate" });
    }
  });

  app.get("/api/analytics/revenue-summary", async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const data = await storage.getRevenueSummary(parseInt(days as string));
      res.json(data);
    } catch (error) {
      console.error("Error fetching revenue summary:", error);
      res.status(500).json({ error: "Failed to fetch revenue summary" });
    }
  });

  // WebPosto Integration Endpoints
  
  // 1. Auth endpoint - Generate bearer token for WebPosto
  app.post("/api/webposto/auth", async (req, res) => {
    try {
      const authRequest: WebPostoAuthRequest = req.body;
      
      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "auth",
        message: "WebPosto authentication request received",
        details: { usuario: authRequest.usuario, codigoEmpresa: authRequest.codigoEmpresa },
      });

      // Validate credentials against stored configuration
      const config = await storage.getConfiguration();
      
      if (!config) {
        await storage.createLog({
          level: "error",
          source: "webposto",
          action: "auth",
          message: "Authentication failed: Configuration not found",
        });
        return res.status(401).json({ error: "Configuration not found" });
      }

      if (
        authRequest.usuario !== config.webpostoUsuario ||
        authRequest.senha !== config.webpostoSenha ||
        authRequest.codigoEmpresa !== config.webpostoCodigoEmpresa
      ) {
        await storage.createLog({
          level: "error",
          source: "webposto",
          action: "auth",
          message: "Authentication failed: Invalid credentials",
          details: authRequest,
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate bearer token (64 char hex)
      const bearerToken = randomBytes(32).toString("hex");
      
      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "auth",
        message: "Authentication successful, token generated",
      });

      const response: WebPostoAuthResponse = {
        bearerToken,
      };

      res.json(response);
    } catch (error) {
      console.error("Error in WebPosto auth:", error);
      await storage.createLog({
        level: "error",
        source: "webposto",
        action: "auth",
        message: `Authentication error: ${error instanceof Error ? error.message : String(error)}`,
      });
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // 2. Validate voucher endpoint
  app.post("/api/webposto/venda/validar", async (req, res) => {
    try {
      const validateRequest: WebPostoValidateRequest = req.body;
      
      // Validate required fields
      if (!validateRequest.codigoEmpresa || !validateRequest.codigoVenda || !validateRequest.codigoVoucher) {
        throw new Error("Missing required fields: codigoEmpresa, codigoVenda, or codigoVoucher");
      }

      if (!validateRequest.produtos || validateRequest.produtos.length === 0) {
        throw new Error("No products in request");
      }
      
      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "validate",
        message: `Voucher validation request: ${validateRequest.codigoVoucher} (${validateRequest.produtos.length} products)`,
        details: validateRequest,
      });

      // Check if transaction already exists (user might be re-validating with changed values)
      let transaction = await storage.getTransactionByCodigoVenda(
        validateRequest.codigoVenda,
        validateRequest.codigoEmpresa
      );

      let idTransacao: string;

      if (transaction) {
        // Transaction exists - KEEP the existing idTransacao (don't generate new one!)
        idTransacao = transaction.idTransacao || `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        // Update existing transaction with new data
        await storage.updateTransaction(transaction.id, {
          codigoVoucher: validateRequest.codigoVoucher,
          horaVenda: validateRequest.horaVenda,
          dataVenda: validateRequest.dataVenda,
          status: "validated",
          webpostoData: validateRequest as any,
        });
        
        // Delete existing products to replace with new ones
        await storage.deleteTransactionProducts(transaction.id);
      } else {
        // New transaction - generate idTransacao
        idTransacao = validateRequest.idTransacao || 
          `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        // Create new transaction record with all WebPosto data
        transaction = await storage.createTransaction({
          codigoEmpresa: validateRequest.codigoEmpresa,
          codigoVenda: validateRequest.codigoVenda,
          codigoVoucher: validateRequest.codigoVoucher,
          horaVenda: validateRequest.horaVenda,
          dataVenda: validateRequest.dataVenda,
          status: "validated",
          webpostoData: validateRequest as any,
          idTransacao,
          tipoCodigo: "P",
        });
      }

      // Store all products with full data
      for (const product of validateRequest.produtos) {
        await storage.createTransactionProduct({
          transactionId: transaction.id,
          codigoSequencia: product.codigoSequencia,
          codigoColaborador: product.codigoColaborador || "",
          nomeColaborador: product.nomeColaborador || "",
          codigoProduto: product.codigoProduto,
          nomeProduto: product.nomeProduto,
          valorVenda: product.valorVenda.toString(),
          quantidade: product.quantidade.toString(),
          valorUnitario: product.valorUnitario.toString(),
        });
      }

      // Call SwS API to validate voucher and get balance
      let balance = 0;
      let swsRequest: any = null;
      let swsResponse: any = null;
      
      try {
        const updatedTransaction = await storage.getTransaction(transaction.id);
        if (updatedTransaction) {
          const swsResult = await swsClient.validateVoucher(updatedTransaction);
          swsRequest = swsResult.request;
          swsResponse = swsResult.response;
          
          // Extract balance from SwS response
          if (swsResponse?.additionalData?.balance) {
            balance = parseFloat(swsResponse.additionalData.balance) || 0;
          }

          await storage.createLog({
            level: "info",
            source: "sws",
            action: "validate_voucher",
            message: `SwS validation successful. Balance: ${balance}`,
            details: { swsRequest, swsResponse, balance },
            transactionId: transaction.id,
          });
        }
      } catch (swsError) {
        // Log SwS error but continue with validation
        await storage.createLog({
          level: "warning",
          source: "sws",
          action: "validate_voucher",
          message: `SwS validation failed, continuing without balance: ${swsError instanceof Error ? swsError.message : String(swsError)}`,
          details: { error: String(swsError) },
          transactionId: transaction.id,
        });
      }

      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "validate",
        message: `Voucher validated successfully: ${validateRequest.codigoVoucher}, ${validateRequest.produtos.length} products stored, balance: ${balance}`,
        details: { idTransacao, productsCount: validateRequest.produtos.length, balance },
        transactionId: transaction.id,
      });

      // Return validation response with balance as discount
      // Note: swsRequest/swsResponse are only included when ?debug=true (for PDV Simulator)
      const response: WebPostoValidateResponse = {
        idTransacao,
        tipoCodigo: "P", // P = Points accumulation
        valorCashBack: balance, // Balance from SwS as discount
        produtos: validateRequest.produtos,
        tipoPagamento: [0], // Accept all payment types
      };

      // Include debug fields only in development environment (used by PDV Simulator for didactic flow)
      // Security: In production, debug data is NEVER exposed, even with ?debug=true
      const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      if (req.query.debug === 'true' && isDevelopment) {
        response.swsRequest = swsRequest;
        response.swsResponse = swsResponse;
      }

      res.json(response);
    } catch (error) {
      console.error("Error validating voucher:", error);
      await storage.createLog({
        level: "error",
        source: "webposto",
        action: "validate",
        message: `Voucher validation error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error), body: req.body },
      });
      res.status(500).json({ 
        mensagemErro: error instanceof Error ? error.message : "Validation failed" 
      });
    }
  });

  // 3. Complete sale endpoint
  app.post("/api/webposto/venda/enviar", async (req, res) => {
    try {
      const sendRequest: WebPostoSendRequest = req.body;
      
      // Validate required fields
      if (!sendRequest.codigoEmpresa || !sendRequest.codigoVenda || !sendRequest.idTransacao) {
        throw new Error("Missing required fields: codigoEmpresa, codigoVenda, or idTransacao");
      }

      if (!sendRequest.produtos || sendRequest.produtos.length === 0) {
        throw new Error("No products in sale request");
      }
      
      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "send",
        message: `Sale confirmation request: ${sendRequest.codigoVenda} (${sendRequest.produtos.length} products, ${sendRequest.prazos?.length || 0} payments)`,
        details: sendRequest,
      });

      // Find existing transaction
      const transaction = await storage.getTransactionByCodigoVenda(
        sendRequest.codigoVenda,
        sendRequest.codigoEmpresa
      );

      if (!transaction) {
        throw new Error(`Transaction not found for venda ${sendRequest.codigoVenda}, empresa ${sendRequest.codigoEmpresa}`);
      }

      // Verify idTransacao matches
      if (transaction.idTransacao !== sendRequest.idTransacao) {
        throw new Error(`idTransacao mismatch: expected ${transaction.idTransacao}, got ${sendRequest.idTransacao}`);
      }

      // Store all payment methods with validation
      if (sendRequest.prazos && sendRequest.prazos.length > 0) {
        for (const payment of sendRequest.prazos) {
          await storage.createTransactionPayment({
            transactionId: transaction.id,
            descricaoFormaPagamento: payment.descricaoFormaPagamento,
            tipoPagamento: payment.tipoPagamento,
            valorPagamento: payment.valorPagamento.toString(),
            idFormaPagamentoAC: payment.idFormaPagamentoAC,
          });
        }
      }

      // Get products for this transaction
      const products = await storage.getTransactionProducts(transaction.id);

      // Send to SwS API
      let swsRequest: any = null;
      let swsResponse: any = null;
      
      try {
        const swsResult = await swsClient.sendSale(transaction, products);
        swsRequest = swsResult.request;
        swsResponse = swsResult.response;
        
        await storage.createLog({
          level: "info",
          source: "webposto",
          action: "send",
          message: `Sale sent successfully to SwS: ${sendRequest.codigoVenda}`,
          transactionId: transaction.id,
        });

        // Return WebPosto expected format (3 fields only)
        // Note: swsRequest/swsResponse are only included when ?debug=true (for PDV Simulator)
        const sendResponse: any = { 
          codigoEmpresa: sendRequest.codigoEmpresa,
          codigoVenda: sendRequest.codigoVenda,
          idTransacao: transaction.idTransacao || "",
        };

        // Include debug fields only in development environment (used by PDV Simulator for didactic flow)
        // Security: In production, debug data is NEVER exposed, even with ?debug=true
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
        if (req.query.debug === 'true' && isDevelopment) {
          sendResponse.swsRequest = swsRequest;
          sendResponse.swsResponse = swsResponse;
        }

        res.json(sendResponse);
      } catch (swsError) {
        // If SwS fails, add to retry queue
        await storage.createLog({
          level: "warning",
          source: "webposto",
          action: "send",
          message: `Sale received but SwS forwarding failed, adding to retry queue: ${swsError instanceof Error ? swsError.message : String(swsError)}`,
          transactionId: transaction.id,
        });
        
        // Add to retry queue for automatic retry
        await retryQueue.addToQueue(transaction.id);
        
        // Still acknowledge receipt to WebPosto in expected format
        res.json({ 
          codigoEmpresa: sendRequest.codigoEmpresa,
          codigoVenda: sendRequest.codigoVenda,
          idTransacao: transaction.idTransacao || "",
        });
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      await storage.createLog({
        level: "error",
        source: "webposto",
        action: "send",
        message: `Sale processing error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error) },
      });
      res.status(500).json({ error: error instanceof Error ? error.message : "Sale processing failed" });
    }
  });

  // 4. Cancel sale endpoint
  app.post("/api/webposto/venda/cancelar", async (req, res) => {
    try {
      const cancelRequest: WebPostoCancelRequest = req.body;
      
      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "cancel",
        message: `Sale cancellation request: ${cancelRequest.codigoVenda}`,
        details: cancelRequest,
      });

      // Find transaction
      const transaction = await storage.getTransactionByCodigoVenda(
        cancelRequest.codigoVenda,
        cancelRequest.codigoEmpresa
      );

      if (!transaction) {
        throw new Error(`Transaction not found: ${cancelRequest.codigoVenda}`);
      }

      // Update transaction status
      await storage.updateTransaction(transaction.id, {
        status: "cancelled",
      });

      await storage.createLog({
        level: "info",
        source: "webposto",
        action: "cancel",
        message: `Sale cancelled successfully: ${cancelRequest.codigoVenda}`,
        transactionId: transaction.id,
      });

      res.json({
        codigoEmpresa: cancelRequest.codigoEmpresa,
        codigoVenda: cancelRequest.codigoVenda,
        idTransacao: cancelRequest.idTransacao,
        success: true,
      });
    } catch (error) {
      console.error("Error cancelling sale:", error);
      await storage.createLog({
        level: "error",
        source: "webposto",
        action: "cancel",
        message: `Sale cancellation error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: String(error) },
      });
      res.status(500).json({ error: error instanceof Error ? error.message : "Cancellation failed" });
    }
  });

  // Field Mappings endpoints
  app.get("/api/field-mappings", async (req, res) => {
    try {
      const { entityType } = req.query;
      const mappings = await storage.listFieldMappings(entityType as string);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching field mappings:", error);
      res.status(500).json({ error: "Failed to fetch field mappings" });
    }
  });

  app.get("/api/field-mappings/:id", async (req, res) => {
    try {
      const mapping = await storage.getFieldMapping(req.params.id);
      if (!mapping) {
        return res.status(404).json({ error: "Field mapping not found" });
      }
      res.json(mapping);
    } catch (error) {
      console.error("Error fetching field mapping:", error);
      res.status(500).json({ error: "Failed to fetch field mapping" });
    }
  });

  app.post("/api/field-mappings", async (req, res) => {
    try {
      const mapping = await storage.createFieldMapping(req.body);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "create_mapping",
        message: `Field mapping created: ${req.body.sourceField} → ${req.body.targetField}`,
        details: mapping,
      });
      
      res.json(mapping);
    } catch (error) {
      console.error("Error creating field mapping:", error);
      res.status(500).json({ error: "Failed to create field mapping" });
    }
  });

  app.put("/api/field-mappings/:id", async (req, res) => {
    try {
      const mapping = await storage.updateFieldMapping(req.params.id, req.body);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "update_mapping",
        message: `Field mapping updated: ${mapping.sourceField} → ${mapping.targetField}`,
        details: mapping,
      });
      
      res.json(mapping);
    } catch (error) {
      console.error("Error updating field mapping:", error);
      res.status(500).json({ error: "Failed to update field mapping" });
    }
  });

  app.delete("/api/field-mappings/:id", async (req, res) => {
    try {
      await storage.deleteFieldMapping(req.params.id);
      
      await storage.createLog({
        level: "info",
        source: "system",
        action: "delete_mapping",
        message: `Field mapping deleted: ${req.params.id}`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting field mapping:", error);
      res.status(500).json({ error: "Failed to delete field mapping" });
    }
  });

  app.get("/api/field-mappings/active/:entityType", async (req, res) => {
    try {
      const mappings = await storage.getActiveFieldMappings(req.params.entityType);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching active field mappings:", error);
      res.status(500).json({ error: "Failed to fetch active field mappings" });
    }
  });

  // Transform preview endpoint
  app.post("/api/transform-preview", async (req, res) => {
    // Add headers to prevent caching
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    try {
      const { produtos = [], transaction = {} } = req.body;
      
      // Get configuration for SwS fields
      const config = await storage.getConfiguration();
      if (!config) {
        return res.status(400).json({ error: "Configuração não encontrada. Configure as credenciais SwS primeiro." });
      }
      
      // Get active field mappings
      const productMappings = await storage.getActiveFieldMappings("product");
      const transactionMappings = await storage.getActiveFieldMappings("transaction");
      
      // Transform products
      const transformedProducts = produtos.map((product: any) => {
        const result: any = {};
        
        if (productMappings.length > 0) {
          for (const mapping of productMappings) {
            let value: any;
            switch (mapping.mappingType) {
              case "fixed":
                value = mapping.fixedValue || "";
                break;
              case "direct":
                value = product[mapping.sourceField!] || mapping.defaultValue || "";
                break;
              case "multiply_100":
                const val100 = parseFloat(product[mapping.sourceField!]?.toString() || mapping.defaultValue || "0");
                value = Math.round(val100 * 100).toString();
                break;
              case "multiply_1000":
                const val1000 = parseFloat(product[mapping.sourceField!]?.toString() || mapping.defaultValue || "0");
                value = Math.round(val1000 * 1000).toString();
                break;
              default:
                value = product[mapping.sourceField!] || mapping.defaultValue || "";
            }
            result[mapping.targetField] = typeof value === 'string' ? value : String(value);
          }
        }
        
        return result;
      });
      
      // Calculate totals
      const totalAmount = produtos.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.valorUnitario || 0) * parseFloat(p.quantidade || 0) * 100), 0
      );
      
      const totalPCost = produtos.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.valorUnitario || 0) * parseFloat(p.quantidade || 0) * 100), 0
      );
      
      // Generate RRN and timestamp
      const rrn = Date.now().toString();
      const created = new Date().toISOString();
      
      // Build complete SwS JSON with all required fields
      const swsJson: any = {
        actionType: "4",
        terminalID: config.swsTerminalId || "{{terminalID}}",
        acquirerID: config.swsAcquirerId || "{{acquirerID}}",
        created: created,
        clientID: config.swsClientId || "{{clientID}}",
        rrn: rrn,
        totalAmount: Math.round(totalAmount).toString(),
        additionalData: {
          products: transformedProducts,
          totalPcost: Math.round(totalPCost).toString()
        },
        currency: config.swsCurrency || "986",
        authCode: "ABC123"
      };
      
      // Apply transaction-level mappings (can override defaults)
      if (transactionMappings.length > 0) {
        for (const mapping of transactionMappings) {
          let value: any;
          switch (mapping.mappingType) {
            case "fixed":
              value = mapping.fixedValue || "";
              break;
            case "direct":
              value = transaction[mapping.sourceField!] || mapping.defaultValue || "";
              break;
            case "multiply_100":
              const val100 = parseFloat(transaction[mapping.sourceField!]?.toString() || mapping.defaultValue || "0");
              value = Math.round(val100 * 100).toString();
              break;
            case "multiply_1000":
              const val1000 = parseFloat(transaction[mapping.sourceField!]?.toString() || mapping.defaultValue || "0");
              value = Math.round(val1000 * 1000).toString();
              break;
            default:
              value = transaction[mapping.sourceField!] || mapping.defaultValue || "";
          }
          swsJson[mapping.targetField] = typeof value === 'string' ? value : String(value);
        }
      }
      
      res.json({
        original: req.body,
        transformed: swsJson,
        productMappings: productMappings.map(m => ({ 
          name: m.name, 
          from: m.sourceField || "(fixo)", 
          to: m.targetField, 
          type: m.mappingType 
        })),
        transactionMappings: transactionMappings.map(m => ({ 
          name: m.name, 
          from: m.sourceField || "(fixo)", 
          to: m.targetField, 
          type: m.mappingType 
        })),
      });
    } catch (error) {
      console.error("Error transforming preview:", error);
      res.status(500).json({ error: "Falha ao gerar preview de transformação" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
