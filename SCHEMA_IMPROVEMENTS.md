# Database Schema - Improvements & Recommendations

## ✅ What's Implemented

### 1. **Complete RAG System Tables**

- `contracts`: Stores uploaded documents with metadata and extracted text
- `clauses`: Extracted contract clauses via AI with vector references
- `bills`: Bill/invoice records with usage tracking
- `anomalies`: Detected billing anomalies with AI explanations
- `execution_logs`: OpenClaw action execution history

### 2. **Performance Optimizations**

✅ **Indexes on frequently queried columns:**

- User IDs, contract IDs, service names
- Due dates for proactive monitoring
- Severity levels for anomaly filtering
- Execution status for job tracking

### 3. **Data Integrity**

✅ **Foreign keys with proper cascade rules:**

- User deletion → cascades to all related data
- Contract deletion → cascades to clauses and execution logs
- Bill deletion → cascades to anomalies
- SET NULL for optional references (e.g., contract → bill)

### 4. **Type Safety**

✅ **Enums for controlled values:**

- Category: rental, saas, utility, insurance, etc.
- Document types: contract, bill, invoice, receipt
- Anomaly types: price_spike, usage_spike, rate_change
- Severity: low, medium, high, critical
- Execution status: queued, in_progress, completed, failed

### 5. **Schema Features**

✅ **UUIDs for main entities** (contracts, bills, clauses, anomalies, execution_logs)

- Better for distributed systems
- Prevents ID enumeration attacks
- Easier sharding in future

✅ **JSONB for flexible data:**

- `penalty_rules`: Array of penalty conditions
- `metadata`: Bill-specific additional data
- `payload`/`result`: Execution input/output

✅ **Decimal types for money:**

- Prevents floating-point precision issues
- Critical for financial calculations

---

## 🚀 Suggested Improvements

### 1. **Add Full-Text Search** (Future Enhancement)

```sql
-- Enable PostgreSQL full-text search on contract text
CREATE INDEX contracts_text_search_idx
  ON contracts USING gin(to_tsvector('english', raw_text));
```

**Why:** Faster keyword searches in contracts without hitting vector DB.

### 2. **Add Soft Deletes** (Optional)

```typescript
deletedAt: timestamp('deleted_at'),
isDeleted: boolean('is_deleted').default(false),
```

**Why:** Keep audit trail, allow "undo" operations, compliance requirements.

### 3. **Add Multi-Tenancy Support** (If Scaling)

```typescript
organizationId: uuid('organization_id').references(() => organizationsTable.id),
```

**Why:** Support business accounts with multiple users.

### 4. **Add Notification Preferences**

```typescript
// New table
export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    userId: integer("user_id").references(() => usersTable.id),
    daysBeforeDue: integer("days_before_due").default(7),
    enableSMS: boolean("enable_sms").default(false),
    enableEmail: boolean("enable_email").default(true),
    enablePush: boolean("enable_push").default(true),
  },
);
```

**Why:** User control over when/how they get bill reminders.

### 5. **Add Rate Limiting Table** (For API Protection)

```typescript
export const apiRateLimitsTable = pgTable("api_rate_limits", {
  userId: integer("user_id"),
  endpoint: varchar("endpoint", { length: 100 }),
  count: integer("count").default(0),
  windowStart: timestamp("window_start").notNull(),
});
```

**Why:** Prevent API abuse, track usage patterns.

### 6. **Add Audit Logs** (Compliance)

```typescript
export const auditLogsTable = pgTable("audit_logs", {
  userId: integer("user_id"),
  action: varchar("action", { length: 100 }),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Why:** Track who changed what and when (GDPR compliance).

---

## 🎯 Current Schema Strengths

### ✅ Production-Ready Features

1. **Proper normalization** - No duplicate data, clear relationships
2. **Indexes for performance** - Fast queries on common patterns
3. **Type safety** - Enums prevent invalid data
4. **Cascading deletes** - Clean data removal
5. **Timestamps everywhere** - Full audit trail
6. **JSONB for flexibility** - Can store arbitrary data without schema changes
7. **Relations defined** - Easy joins with Drizzle queries

### ✅ RAG-Optimized

- `pineconeNamespace` for vector organization
- `vectorId` for clause-to-embedding mapping
- `chunksIndexed` for processing status
- `confidence` for AI quality tracking

### ✅ Bill Detective Logic Ready

- Historical bill tracking via `billsTable`
- Anomaly detection with `expectedAmount` vs `actualAmount`
- AI reasoning stored in `explanation`
- Suggested actions for automation

---

## 📊 Schema Size Estimates (for 1000 users)

| Table          | Rows        | Storage    | Growth                |
| -------------- | ----------- | ---------- | --------------------- |
| contracts      | 5,000       | ~50MB      | 5 contracts/user      |
| clauses        | 50,000      | ~100MB     | 10 clauses/contract   |
| bills          | 60,000      | ~80MB      | 60 bills/user/year    |
| anomalies      | 5,000       | ~20MB      | ~10% of bills flagged |
| execution_logs | 10,000      | ~30MB      | 2 actions/anomaly     |
| **Total**      | **130,000** | **~280MB** | **Year 1**            |

**Scaling:** Current schema handles 100K+ users easily with proper indexes.

---

## 🔑 Missing from Original Plan (Now Added)

✅ **Better metadata tracking:**

- `mimeType`, `textLength`, `originalFilename` for documents
- `embeddingModel` to track which AI generated embeddings
- `currency` for international support

✅ **Execution tracking improvements:**

- Separate `queuedAt`, `startedAt`, `completedAt` timestamps
- `errorMessage` for debugging failed executions
- `executionId` for external system correlation

✅ **Anomaly resolution workflow:**

- `isResolved`, `resolvedAt`, `resolutionNotes`
- Track which anomalies users acted on

✅ **Bill payment tracking:**

- `isPaid`, `paidAt` fields
- Helps calculate actual spending vs. expected

---

## 🛠️ Next Steps

1. **Run migration:**

   ```bash
   npm run db:push
   ```

2. **Verify tables created:**

   ```bash
   npm run db:studio
   # Opens Drizzle Studio at https://local.drizzle.studio
   ```

3. **Seed test data:**
   Create `lib/seed.ts` with sample contracts and bills

4. **Build APIs:**
   Start with `/api/ingest` endpoint using this schema

---

## 📝 Query Examples

### Get all bills with anomalies for a user:

```typescript
const billsWithAnomalies = await db.query.billsTable.findMany({
  where: eq(billsTable.userId, userId),
  with: {
    anomalies: {
      where: eq(anomaliesTable.isResolved, false),
    },
  },
});
```

### Get contract with all extracted clauses:

```typescript
const contract = await db.query.contractsTable.findFirst({
  where: eq(contractsTable.id, contractId),
  with: {
    clauses: true,
    bills: {
      orderBy: desc(billsTable.billDate),
      limit: 12, // Last year
    },
  },
});
```

### Find upcoming bills (for heartbeat system):

```typescript
const upcomingBills = await db.query.billsTable.findMany({
  where: and(
    gte(billsTable.dueDate, new Date()),
    lte(billsTable.dueDate, addDays(new Date(), 7)),
    eq(billsTable.isPaid, false),
  ),
});
```

This schema is **production-ready** for your demo! 🚀
