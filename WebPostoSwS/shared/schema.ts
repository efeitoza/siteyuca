import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Configuration table for WebPosto and SwS API settings
export const configurations = pgTable("configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // "default" or custom config name
  
  // WebPosto credentials
  webpostoUsuario: text("webposto_usuario"),
  webpostoSenha: text("webposto_senha"),
  webpostoCodigoEmpresa: text("webposto_codigo_empresa"),
  
  // SwS API credentials
  swsHost: text("sws_host"),
  swsTerminalId: text("sws_terminal_id"),
  swsAcquirerId: text("sws_acquirer_id"),
  swsClientId: text("sws_client_id"),
  swsPassword: text("sws_password"),
  swsCurrency: text("sws_currency").default("643"),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transactions from WebPosto
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // WebPosto data
  codigoEmpresa: text("codigo_empresa").notNull(),
  codigoVenda: text("codigo_venda").notNull(),
  codigoVoucher: text("codigo_voucher"),
  horaVenda: text("hora_venda"),
  dataVenda: text("data_venda"),
  
  // Integration data
  idTransacao: text("id_transacao"), // Returned by validation
  tipoCodigo: text("tipo_codigo"), // D, R, P
  valorCashBack: decimal("valor_cashback", { precision: 10, scale: 2 }),
  valorPorUnidadeDesconto: decimal("valor_por_unidade_desconto", { precision: 10, scale: 2 }),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, validated, sent, cancelled, failed
  swsStatus: text("sws_status"), // Status from SwS API
  swsRrn: text("sws_rrn"), // RRN timestamp for SwS
  swsAuthCode: text("sws_auth_code"), // Auth code from SwS
  
  // Raw data storage
  webpostoData: jsonb("webposto_data"), // Full WebPosto payload
  swsData: jsonb("sws_data"), // Full SwS payload
  
  // Error tracking
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Products from transactions
export const transactionProducts = pgTable("transaction_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  
  // WebPosto product data
  codigoSequencia: integer("codigo_sequencia").notNull(),
  codigoColaborador: text("codigo_colaborador"),
  nomeColaborador: text("nome_colaborador"),
  codigoProduto: text("codigo_produto").notNull(),
  nomeProduto: text("nome_produto").notNull(),
  valorVenda: decimal("valor_venda", { precision: 10, scale: 2 }).notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 3 }).notNull(),
  valorUnitario: decimal("valor_unitario", { precision: 10, scale: 2 }).notNull(),
  
  // SwS product mapping
  swsProductId: text("sws_product_id"),
  swsBarcode: text("sws_barcode"),
  swsGroup: text("sws_group"),
  swsPCost: decimal("sws_pcost", { precision: 10, scale: 2 }),
  swsTax: text("sws_tax"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payment methods from transactions
export const transactionPayments = pgTable("transaction_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  
  descricaoFormaPagamento: text("descricao_forma_pagamento").notNull(),
  tipoPagamento: integer("tipo_pagamento").notNull(),
  valorPagamento: decimal("valor_pagamento", { precision: 10, scale: 2 }).notNull(),
  idFormaPagamentoAC: text("id_forma_pagamento_ac"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Integration logs for debugging
export const integrationLogs = pgTable("integration_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  
  level: text("level").notNull(), // info, warning, error, debug
  source: text("source").notNull(), // webposto, sws, system
  action: text("action").notNull(), // validate, send, cancel, auth
  message: text("message").notNull(),
  details: jsonb("details"), // Additional context
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Field mappings for WebPosto to SwS transformation
export const fieldMappings = pgTable("field_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Mapping configuration
  name: text("name").notNull(), // Descriptive name for this mapping
  sourceField: text("source_field"), // WebPosto field name (optional for "fixed" mappings)
  targetField: text("target_field").notNull(), // SwS field name
  
  // Transformation rules
  mappingType: text("mapping_type").notNull().default("direct"), // direct, fixed, multiply_100, multiply_1000
  fixedValue: text("fixed_value"), // Used when mappingType is "fixed"
  defaultValue: text("default_value"), // Fallback value if source field is empty
  
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  entityType: text("entity_type").notNull().default("product"), // product, transaction, payment, validate
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Notification settings and history
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  webhookUrl: text("webhook_url"),
  webhookEnabled: boolean("webhook_enabled").default(false),
  
  emailRecipients: text("email_recipients"), // Comma-separated emails
  emailEnabled: boolean("email_enabled").default(false),
  
  notifyOnRetryFailed: boolean("notify_on_retry_failed").default(true),
  notifyOnSwsError: boolean("notify_on_sws_error").default(false),
  notifyOnWebpostoError: boolean("notify_on_webposto_error").default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationHistory = pgTable("notification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  
  type: text("type").notNull(), // webhook, email
  recipient: text("recipient").notNull(), // URL or email
  event: text("event").notNull(), // retry_failed, sws_error, etc
  message: text("message").notNull(),
  payload: jsonb("payload"),
  
  status: text("status").notNull(), // sent, failed
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const transactionsRelations = relations(transactions, ({ many }) => ({
  products: many(transactionProducts),
  payments: many(transactionPayments),
  logs: many(integrationLogs),
}));

export const transactionProductsRelations = relations(transactionProducts, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionProducts.transactionId],
    references: [transactions.id],
  }),
}));

export const transactionPaymentsRelations = relations(transactionPayments, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionPayments.transactionId],
    references: [transactions.id],
  }),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  transaction: one(transactions, {
    fields: [integrationLogs.transactionId],
    references: [transactions.id],
  }),
}));

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  transaction: one(transactions, {
    fields: [notificationHistory.transactionId],
    references: [transactions.id],
  }),
}));

// Insert schemas
export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionProductSchema = createInsertSchema(transactionProducts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionPaymentSchema = createInsertSchema(transactionPayments).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationLogSchema = createInsertSchema(integrationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
});

export const insertFieldMappingSchema = createInsertSchema(fieldMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Make sourceField optional when mappingType is "fixed"
  sourceField: z.string().optional().default(""),
  fixedValue: z.string().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
});

// Types
export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionProduct = typeof transactionProducts.$inferSelect;
export type InsertTransactionProduct = z.infer<typeof insertTransactionProductSchema>;

export type TransactionPayment = typeof transactionPayments.$inferSelect;
export type InsertTransactionPayment = z.infer<typeof insertTransactionPaymentSchema>;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = z.infer<typeof insertIntegrationLogSchema>;

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type FieldMapping = typeof fieldMappings.$inferSelect;
export type InsertFieldMapping = z.infer<typeof insertFieldMappingSchema>;

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

// API Request/Response types
export interface WebPostoAuthRequest {
  usuario: string;
  senha: string;
  codigoEmpresa: string;
}

export interface WebPostoAuthResponse {
  bearerToken: string;
}

export interface WebPostoValidateRequest {
  codigoEmpresa: string;
  codigoVoucher: string;
  horaVenda: string;
  dataVenda: string;
  codigoVenda: string;
  idTransacao?: string; // Optional: WebPosto may send this
  produtos: WebPostoProduct[];
}

export interface WebPostoProduct {
  codigoSequencia: number;
  codigoColaborador: string;
  nomeColaborador: string;
  codigoProduto: string;
  nomeProduto: string;
  valorVenda: number;
  quantidade: number;
  valorUnitario: number;
}

export interface WebPostoValidateResponse {
  idTransacao: string;
  tipoCodigo: string;
  valorCashBack?: number;
  valorPorUnidadeDesconto?: number;
  mensagemErro?: string;
  tipoPagamento?: number[];
  produtos: WebPostoProduct[];
  swsRequest?: any; // SwS API request for debugging/display
  swsResponse?: any; // SwS API response for debugging/display
}

export interface WebPostoSendRequest {
  codigoEmpresa: string;
  codigoVenda: string;
  idTransacao: string;
  produtos: WebPostoProduct[];
  prazos: WebPostoPayment[];
}

export interface WebPostoPayment {
  descricaoFormaPagamento: string;
  tipoPagamento: number;
  valorPagamento: number;
  idFormaPagamentoAC: string;
  idTransacao?: string;
}

export interface WebPostoCancelRequest {
  codigoEmpresa: string;
  codigoVenda: string;
  idTransacao: string;
}

export interface SwSTokenRequest {
  terminalID: string;
  acquirerID: string;
  language: string;
  password: string;
}

export interface SwSTokenResponse {
  token: string;
}

export interface SwSSaleRequest {
  actionType: string;
  terminalID: string;
  acquirerID: string;
  created: string;
  clientID: string;
  rrn: string;
  totalAmount: string;
  additionalData: {
    products: SwSProduct[];
    totalPcost: string;
  };
  currency: string;
  authCode: string;
}

export interface SwSProduct {
  name: string;
  productId: string;
  pCost: string;
  price: string;
  quantity: string;
  markupDiscount: string;
  tax: string;
  barcode: string;
  group: string;
  flag: string;
}
