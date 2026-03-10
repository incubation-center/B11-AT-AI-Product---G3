ALTER TABLE "users_table" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users_table" CASCADE;--> statement-breakpoint
ALTER TABLE "bills" DROP CONSTRAINT "bills_user_id_users_table_id_fk";
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_user_id_users_table_id_fk";
--> statement-breakpoint
ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_user_id_users_table_id_fk";
--> statement-breakpoint
ALTER TABLE "bills" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "execution_logs" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;