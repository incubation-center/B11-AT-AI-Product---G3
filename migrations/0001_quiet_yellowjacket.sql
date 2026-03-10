CREATE TYPE "public"."anomaly_type" AS ENUM('price_spike', 'usage_spike', 'rate_change', 'suspicious_fee', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('rental', 'saas', 'utility', 'insurance', 'internet', 'other');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('contract', 'bill', 'invoice', 'receipt');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('queued', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"anomaly_type" "anomaly_type" NOT NULL,
	"severity" "severity" DEFAULT 'medium' NOT NULL,
	"expected_amount" numeric(10, 2),
	"actual_amount" numeric(10, 2),
	"deviation_percent" numeric(5, 2),
	"explanation" text NOT NULL,
	"ai_confidence" numeric(5, 2),
	"suggested_action" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"detected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid,
	"user_id" integer NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"bill_date" timestamp NOT NULL,
	"due_date" timestamp,
	"usage" numeric(10, 2),
	"usage_unit" varchar(50),
	"source_document_id" uuid,
	"metadata" jsonb,
	"is_paid" boolean DEFAULT false,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"clause_type" varchar(100) NOT NULL,
	"clause_text" text NOT NULL,
	"notice_period_days" integer,
	"penalty_amount" numeric(10, 2),
	"penalty_rules" jsonb,
	"vector_id" text,
	"embedding_model" varchar(50),
	"confidence" numeric(5, 2),
	"extracted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"category" "category",
	"doc_type" "doc_type" DEFAULT 'contract' NOT NULL,
	"original_filename" text,
	"mime_type" varchar(100),
	"file_key" text,
	"text_length" integer,
	"raw_text" text,
	"pinecone_namespace" varchar(100),
	"chunks_indexed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"execution_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"skill" varchar(100) NOT NULL,
	"contract_id" uuid,
	"anomaly_id" uuid,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"status" "execution_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reset-password" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts_table" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "posts_table" CASCADE;--> statement-breakpoint
ALTER TABLE "users_table" ALTER COLUMN "age" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users_table" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_source_document_id_contracts_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_anomaly_id_anomalies_id_fk" FOREIGN KEY ("anomaly_id") REFERENCES "public"."anomalies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset-password" ADD CONSTRAINT "reset-password_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anomalies_bill_id_idx" ON "anomalies" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "anomalies_severity_idx" ON "anomalies" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "anomalies_is_resolved_idx" ON "anomalies" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "bills_user_id_idx" ON "bills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bills_contract_id_idx" ON "bills" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "bills_due_date_idx" ON "bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "bills_service_name_idx" ON "bills" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "clauses_contract_id_idx" ON "clauses" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "clauses_type_idx" ON "clauses" USING btree ("clause_type");--> statement-breakpoint
CREATE INDEX "contracts_user_id_idx" ON "contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contracts_service_name_idx" ON "contracts" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "contracts_category_idx" ON "contracts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "execution_logs_user_id_idx" ON "execution_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "execution_logs_status_idx" ON "execution_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "execution_logs_execution_id_idx" ON "execution_logs" USING btree ("execution_id");