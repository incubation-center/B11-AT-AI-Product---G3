import {
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    uuid,
    decimal,
    jsonb,
    varchar,
    boolean,
    pgEnum,
    index,
  } from "drizzle-orm/pg-core";
  import { relations } from "drizzle-orm";
import { user } from "./users";
  
  
  
  export const categoryEnum = pgEnum("category", [
    "rental",
    "saas",
    "utility",
    "insurance",
    "internet",
    "other",
  ]);
  
  export const docTypeEnum = pgEnum("doc_type", [
    "contract",
    "bill",
    "invoice",
    "receipt",
  ]);
  
  export const anomalyTypeEnum = pgEnum("anomaly_type", [
    "price_spike",
    "usage_spike",
    "rate_change",
    "suspicious_fee",
    "unknown",
  ]);
  
  export const severityEnum = pgEnum("severity", [
    "low",
    "medium",
    "high",
    "critical",
  ]);
  
  export const executionStatusEnum = pgEnum("execution_status", [
    "queued",
    "in_progress",
    "completed",
    "failed",
  ]);
  

  
  export const contractsTable = pgTable(
    "contracts",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
  
      // Document metadata
      serviceName: varchar("service_name", { length: 255 }).notNull(),
      category: categoryEnum("category"),
      docType: docTypeEnum("doc_type").notNull().default("contract"),
      originalFilename: text("original_filename"),
      mimeType: varchar("mime_type", { length: 100 }),
  
      // Storage info
      fileKey: text("file_key"), // S3/local file path
      textLength: integer("text_length"),
      rawText: text("raw_text"), // Extracted text from document
  
      // Vector DB reference
      pineconeNamespace: varchar("pinecone_namespace", { length: 100 }), // For organizing vectors
      chunksIndexed: integer("chunks_indexed").default(0),
  
      // Timestamps
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
    },
    (table) => ({
      userIdIdx: index("contracts_user_id_idx").on(table.userId),
      serviceNameIdx: index("contracts_service_name_idx").on(table.serviceName),
      categoryIdx: index("contracts_category_idx").on(table.category),
    }),
  );
  
  
  
  export const clausesTable = pgTable(
    "clauses",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      contractId: uuid("contract_id")
        .notNull()
        .references(() => contractsTable.id, { onDelete: "cascade" }),
  
      // Clause details
      clauseType: varchar("clause_type", { length: 100 }).notNull(), // e.g., 'notice_period', 'penalty', 'renewal'
      clauseText: text("clause_text").notNull(), // The actual clause content
  
      // Structured extraction
      noticePeriodDays: integer("notice_period_days"), // Days before cancellation required
      penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }),
      penaltyRules: jsonb("penalty_rules"), // JSON array of penalty conditions
  
      // Vector DB reference
      vectorId: text("vector_id"), // Pinecone vector ID for this clause
      embeddingModel: varchar("embedding_model", { length: 50 }), // e.g., 'text-embedding-3-small'
  
      // Metadata
      confidence: decimal("confidence", { precision: 5, scale: 2 }), // AI extraction confidence (0-100)
      extractedAt: timestamp("extracted_at").notNull().defaultNow(),
    },
    (table) => ({
      contractIdIdx: index("clauses_contract_id_idx").on(table.contractId),
      clauseTypeIdx: index("clauses_type_idx").on(table.clauseType),
    }),
  );
  
  
  export const billsTable = pgTable(
    "bills",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      contractId: uuid("contract_id").references(() => contractsTable.id, {
        onDelete: "set null",
      }),
      userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
  
      // Bill details
      serviceName: varchar("service_name", { length: 255 }).notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      currency: varchar("currency", { length: 3 }).default("USD"),
  
      // Dates
      billDate: timestamp("bill_date").notNull(),
      dueDate: timestamp("due_date"),
  
      // Usage data (for utility bills)
      usage: decimal("usage", { precision: 10, scale: 2 }), // e.g., kWh, GB, minutes
      usageUnit: varchar("usage_unit", { length: 50 }), // e.g., 'kWh', 'GB'
  
      // Source document
      sourceDocumentId: uuid("source_document_id").references(
        () => contractsTable.id,
        { onDelete: "set null" },
      ),
  
      // Metadata
      metadata: jsonb("metadata"), // Additional bill-specific data
      isPaid: boolean("is_paid").default(false),
      paidAt: timestamp("paid_at"),
  
      createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
      userIdIdx: index("bills_user_id_idx").on(table.userId),
      contractIdIdx: index("bills_contract_id_idx").on(table.contractId),
      dueDateIdx: index("bills_due_date_idx").on(table.dueDate),
      serviceNameIdx: index("bills_service_name_idx").on(table.serviceName),
    }),
  );
  
  
  
  export const anomaliesTable = pgTable(
    "anomalies",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      billId: uuid("bill_id")
        .notNull()
        .references(() => billsTable.id, { onDelete: "cascade" }),
  
      // Anomaly classification
      anomalyType: anomalyTypeEnum("anomaly_type").notNull(),
      severity: severityEnum("severity").notNull().default("medium"),
  
      // Analysis
      expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }),
      actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
      deviationPercent: decimal("deviation_percent", { precision: 5, scale: 2 }),
  
      // AI explanation
      explanation: text("explanation").notNull(), // Why the anomaly occurred
      aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // 0-100
  
      // Suggested actions
      suggestedAction: text("suggested_action"), 
  
      // Resolution tracking
      isResolved: boolean("is_resolved").default(false),
      resolvedAt: timestamp("resolved_at"),
      resolutionNotes: text("resolution_notes"),
  
      detectedAt: timestamp("detected_at").notNull().defaultNow(),
    },
    (table) => ({
      billIdIdx: index("anomalies_bill_id_idx").on(table.billId),
      severityIdx: index("anomalies_severity_idx").on(table.severity),
      isResolvedIdx: index("anomalies_is_resolved_idx").on(table.isResolved),
    }),
  );
  
  
  
  export const executionLogsTable = pgTable(
    "execution_logs",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
  
      // Execution details
      executionId: uuid("execution_id").notNull(), // External tracking ID
      action: varchar("action", { length: 100 }).notNull(), // 'cancel', 'dispute', 'refund'
      skill: varchar("skill", { length: 100 }).notNull(), // 'just-fucking-cancel', 'ai-pdf-builder', etc.
  
      // Related entities
      contractId: uuid("contract_id").references(() => contractsTable.id, {
        onDelete: "set null",
      }),
      anomalyId: uuid("anomaly_id").references(() => anomaliesTable.id, {
        onDelete: "set null",
      }),
  
      // Execution payload & result
      payload: jsonb("payload").notNull(), // Input data for the skill
      result: jsonb("result"), // Output from the skill
  
      // Status tracking
      status: executionStatusEnum("status").notNull().default("queued"),
      errorMessage: text("error_message"),
  
      // Timestamps
      queuedAt: timestamp("queued_at").notNull().defaultNow(),
      startedAt: timestamp("started_at"),
      completedAt: timestamp("completed_at"),
    },
    (table) => ({
      userIdIdx: index("execution_logs_user_id_idx").on(table.userId),
      statusIdx: index("execution_logs_status_idx").on(table.status),
      executionIdIdx: index("execution_logs_execution_id_idx").on(
        table.executionId,
      ),
    }),
  );
  
  
  export const usersRelations = relations(user, ({ many }) => ({
    contracts: many(contractsTable),
    bills: many(billsTable),
    executionLogs: many(executionLogsTable),
  }));
  
  export const contractsRelations = relations(
    contractsTable,
    ({ one, many }) => ({
      user: one(user, {
        fields: [contractsTable.userId],
        references: [user.id],
      }),
      clauses: many(clausesTable),
      bills: many(billsTable),
      executionLogs: many(executionLogsTable),
    }),
  );
  
  export const billsRelations = relations(billsTable, ({ one, many }) => ({
    user: one(user, {
      fields: [billsTable.userId],
      references: [user.id],
    }),
    contract: one(contractsTable, {
      fields: [billsTable.contractId],
      references: [contractsTable.id],
    }),
    anomalies: many(anomaliesTable),
  }));
  
  export const anomaliesRelations = relations(anomaliesTable, ({ one }) => ({
    bill: one(billsTable, {
      fields: [anomaliesTable.billId],
      references: [billsTable.id],
    }),
  }));
  
  
  // Users
  export type InsertUser = typeof user.$inferInsert;
  export type SelectUser = typeof user.$inferSelect;
  
  // Contracts
  export type InsertContract = typeof contractsTable.$inferInsert;
  export type SelectContract = typeof contractsTable.$inferSelect;
  
  // Clauses
  export type InsertClause = typeof clausesTable.$inferInsert;
  export type SelectClause = typeof clausesTable.$inferSelect;
  
  // Bills
  export type InsertBill = typeof billsTable.$inferInsert;
  export type SelectBill = typeof billsTable.$inferSelect;
  
  // Anomalies
  export type InsertAnomaly = typeof anomaliesTable.$inferInsert;
  export type SelectAnomaly = typeof anomaliesTable.$inferSelect;
  
  // Execution Logs
  export type InsertExecutionLog = typeof executionLogsTable.$inferInsert;
  export type SelectExecutionLog = typeof executionLogsTable.$inferSelect;
  