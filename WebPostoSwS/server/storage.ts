// Referenced from javascript_database blueprint
import { 
  configurations,
  transactions,
  transactionProducts,
  transactionPayments,
  integrationLogs,
  notificationSettings,
  notificationHistory,
  fieldMappings,
  type Configuration,
  type InsertConfiguration,
  type Transaction,
  type InsertTransaction,
  type TransactionProduct,
  type InsertTransactionProduct,
  type TransactionPayment,
  type InsertTransactionPayment,
  type IntegrationLog,
  type InsertIntegrationLog,
  type NotificationSettings,
  type InsertNotificationSettings,
  type NotificationHistory,
  type InsertNotificationHistory,
  type FieldMapping,
  type InsertFieldMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Configuration
  getConfiguration(name?: string): Promise<Configuration | undefined>;
  upsertConfiguration(config: InsertConfiguration): Promise<Configuration>;
  
  // Transactions
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByCodigoVenda(codigoVenda: string, codigoEmpresa: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  listTransactions(limit?: number): Promise<Transaction[]>;
  
  // Transaction Products
  createTransactionProduct(product: InsertTransactionProduct): Promise<TransactionProduct>;
  getTransactionProducts(transactionId: string): Promise<TransactionProduct[]>;
  deleteTransactionProducts(transactionId: string): Promise<void>;
  
  // Transaction Payments
  createTransactionPayment(payment: InsertTransactionPayment): Promise<TransactionPayment>;
  getTransactionPayments(transactionId: string): Promise<TransactionPayment[]>;
  
  // Logs
  createLog(log: InsertIntegrationLog): Promise<IntegrationLog>;
  listLogs(limit?: number): Promise<IntegrationLog[]>;
  
  // Notification Settings
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  upsertNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  
  // Notification History
  createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory>;
  listNotificationHistory(limit?: number): Promise<NotificationHistory[]>;
  
  // Field Mappings
  listFieldMappings(entityType?: string): Promise<FieldMapping[]>;
  getFieldMapping(id: string): Promise<FieldMapping | undefined>;
  createFieldMapping(mapping: InsertFieldMapping): Promise<FieldMapping>;
  updateFieldMapping(id: string, updates: Partial<InsertFieldMapping>): Promise<FieldMapping>;
  deleteFieldMapping(id: string): Promise<void>;
  getActiveFieldMappings(entityType: string): Promise<FieldMapping[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  }>;
  
  // Analytics
  getTransactionsByPeriod(period: 'hour' | 'day' | 'week' | 'month', days: number): Promise<Array<{
    period: string;
    total: number;
    successful: number;
    failed: number;
  }>>;
  getTopProducts(limit: number, days: number): Promise<Array<{
    productDescription: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }>>;
  getSuccessRate(days: number): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  }>;
  getRevenueSummary(days: number): Promise<{
    totalRevenue: number;
    averageTransactionValue: number;
    transactionCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Configuration
  async getConfiguration(name: string = "default"): Promise<Configuration | undefined> {
    const [config] = await db
      .select()
      .from(configurations)
      .where(eq(configurations.name, name))
      .limit(1);
    return config || undefined;
  }

  async upsertConfiguration(config: InsertConfiguration): Promise<Configuration> {
    const existing = await this.getConfiguration(config.name || "default");
    
    if (existing) {
      const [updated] = await db
        .update(configurations)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(configurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(configurations)
        .values(config)
        .returning();
      return created;
    }
  }

  // Transactions
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    return transaction || undefined;
  }

  async getTransactionByCodigoVenda(codigoVenda: string, codigoEmpresa: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        sql`${transactions.codigoVenda} = ${codigoVenda} AND ${transactions.codigoEmpresa} = ${codigoEmpresa}`
      )
      .limit(1);
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return created;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async listTransactions(limit: number = 100): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Transaction Products
  async createTransactionProduct(product: InsertTransactionProduct): Promise<TransactionProduct> {
    const [created] = await db
      .insert(transactionProducts)
      .values(product)
      .returning();
    return created;
  }

  async getTransactionProducts(transactionId: string): Promise<TransactionProduct[]> {
    return await db
      .select()
      .from(transactionProducts)
      .where(eq(transactionProducts.transactionId, transactionId));
  }

  async deleteTransactionProducts(transactionId: string): Promise<void> {
    await db
      .delete(transactionProducts)
      .where(eq(transactionProducts.transactionId, transactionId));
  }

  // Transaction Payments
  async createTransactionPayment(payment: InsertTransactionPayment): Promise<TransactionPayment> {
    const [created] = await db
      .insert(transactionPayments)
      .values(payment)
      .returning();
    return created;
  }

  async getTransactionPayments(transactionId: string): Promise<TransactionPayment[]> {
    return await db
      .select()
      .from(transactionPayments)
      .where(eq(transactionPayments.transactionId, transactionId));
  }

  // Logs
  async createLog(log: InsertIntegrationLog): Promise<IntegrationLog> {
    const [created] = await db
      .insert(integrationLogs)
      .values(log)
      .returning();
    return created;
  }

  async listLogs(limit: number = 200): Promise<IntegrationLog[]> {
    return await db
      .select()
      .from(integrationLogs)
      .orderBy(desc(integrationLogs.createdAt))
      .limit(limit);
  }

  // Notification Settings
  async getNotificationSettings(): Promise<NotificationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .limit(1);
    return settings || undefined;
  }

  async upsertNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings> {
    const existing = await this.getNotificationSettings();
    
    if (existing) {
      const [updated] = await db
        .update(notificationSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(notificationSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(notificationSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  // Notification History
  async createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory> {
    const [created] = await db
      .insert(notificationHistory)
      .values(history)
      .returning();
    return created;
  }

  async listNotificationHistory(limit: number = 100): Promise<NotificationHistory[]> {
    return await db
      .select()
      .from(notificationHistory)
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  }> {
    const [stats] = await db
      .select({
        totalTransactions: sql<number>`count(*)::int`,
        successfulTransactions: sql<number>`count(*) filter (where ${transactions.status} = 'sent')::int`,
        failedTransactions: sql<number>`count(*) filter (where ${transactions.status} = 'failed')::int`,
        pendingTransactions: sql<number>`count(*) filter (where ${transactions.status} IN ('pending', 'validated'))::int`,
      })
      .from(transactions);

    return stats || {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
    };
  }

  // Analytics
  async getTransactionsByPeriod(period: 'hour' | 'day' | 'week' | 'month', days: number): Promise<Array<{
    period: string;
    total: number;
    successful: number;
    failed: number;
  }>> {
    const periodFormat = {
      hour: 'YYYY-MM-DD HH24:00',
      day: 'YYYY-MM-DD',
      week: 'IYYY-IW',
      month: 'YYYY-MM',
    }[period];

    const results = await db.execute<{
      period: string;
      total: number;
      successful: number;
      failed: number;
    }>(sql`
      SELECT 
        to_char(created_at, ${sql.raw(`'${periodFormat}'`)}) as period,
        count(*)::int as total,
        count(*) filter (where status = 'sent')::int as successful,
        count(*) filter (where status = 'failed')::int as failed
      FROM ${transactions}
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY to_char(created_at, ${sql.raw(`'${periodFormat}'`)})
      ORDER BY to_char(created_at, ${sql.raw(`'${periodFormat}'`)})
    `);

    return results.rows;
  }

  async getTopProducts(limit: number, days: number): Promise<Array<{
    productDescription: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionCount: number;
  }>> {
    const results = await db.execute<{
      productDescription: string;
      totalQuantity: string;
      totalRevenue: string;
      transactionCount: number;
    }>(sql`
      SELECT 
        tp.nome_produto as "productDescription",
        sum(tp.quantidade)::numeric as "totalQuantity",
        sum(tp.valor_unitario * tp.quantidade)::numeric as "totalRevenue",
        count(distinct tp.transaction_id)::int as "transactionCount"
      FROM ${transactionProducts} tp
      INNER JOIN ${transactions} t ON tp.transaction_id = t.id
      WHERE t.created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY tp.nome_produto
      ORDER BY sum(tp.valor_unitario * tp.quantidade) DESC
      LIMIT ${limit}
    `);

    return results.rows.map(row => ({
      productDescription: row.productDescription,
      totalQuantity: parseFloat(row.totalQuantity || '0'),
      totalRevenue: parseFloat(row.totalRevenue || '0'),
      transactionCount: row.transactionCount,
    }));
  }

  async getSuccessRate(days: number): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        successful: sql<number>`count(*) filter (where ${transactions.status} = 'sent')::int`,
        failed: sql<number>`count(*) filter (where ${transactions.status} = 'failed')::int`,
        pending: sql<number>`count(*) filter (where ${transactions.status} IN ('pending', 'validated'))::int`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`);

    const total = stats?.total || 0;
    const successful = stats?.successful || 0;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful: successful,
      failed: stats?.failed || 0,
      pending: stats?.pending || 0,
      successRate,
    };
  }

  async getRevenueSummary(days: number): Promise<{
    totalRevenue: number;
    averageTransactionValue: number;
    transactionCount: number;
  }> {
    const [stats] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${transactions.valorCashBack}), 0)::numeric`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days' AND ${transactions.status} = 'sent'`);

    const totalRevenue = parseFloat(stats?.totalRevenue?.toString() || '0');
    const transactionCount = stats?.transactionCount || 0;
    const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    return {
      totalRevenue,
      averageTransactionValue,
      transactionCount,
    };
  }

  // Field Mappings
  async listFieldMappings(entityType?: string): Promise<FieldMapping[]> {
    const query = db.select().from(fieldMappings).orderBy(desc(fieldMappings.createdAt));
    
    if (entityType) {
      return await query.where(eq(fieldMappings.entityType, entityType));
    }
    
    return await query;
  }

  async getFieldMapping(id: string): Promise<FieldMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(fieldMappings)
      .where(eq(fieldMappings.id, id))
      .limit(1);
    return mapping || undefined;
  }

  async createFieldMapping(mapping: InsertFieldMapping): Promise<FieldMapping> {
    // Auto-generate name if not provided
    const mappingWithName = {
      ...mapping,
      name: mapping.name || `${mapping.entityType}_${mapping.targetField}_${mapping.mappingType}`,
    };
    
    const [created] = await db
      .insert(fieldMappings)
      .values(mappingWithName)
      .returning();
    return created;
  }

  async updateFieldMapping(id: string, updates: Partial<InsertFieldMapping>): Promise<FieldMapping> {
    const [updated] = await db
      .update(fieldMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fieldMappings.id, id))
      .returning();
    return updated;
  }

  async deleteFieldMapping(id: string): Promise<void> {
    await db.delete(fieldMappings).where(eq(fieldMappings.id, id));
  }

  async getActiveFieldMappings(entityType: string): Promise<FieldMapping[]> {
    return await db
      .select()
      .from(fieldMappings)
      .where(sql`${fieldMappings.entityType} = ${entityType} AND ${fieldMappings.isActive} = true`)
      .orderBy(fieldMappings.targetField);
  }
}

export const storage = new DatabaseStorage();
