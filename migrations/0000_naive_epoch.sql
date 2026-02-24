CREATE TABLE "calculations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"client_name" text NOT NULL,
	"project_name" text NOT NULL,
	"total_cost" double precision NOT NULL,
	"suggested_price" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"employee_id" text,
	"employee_name" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"document" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '',
	"cep" text DEFAULT '' NOT NULL,
	"neighborhood" text DEFAULT '' NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"complement" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"uf" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"commission_rate" double precision DEFAULT 0 NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"document" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '',
	"cep" text DEFAULT '' NOT NULL,
	"neighborhood" text DEFAULT '' NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"complement" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"uf" text DEFAULT '' NOT NULL,
	"linked_user_id" text
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cost_per_kg" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT 'default' NOT NULL,
	"user_id" text NOT NULL,
	"logo_url" text,
	"profit_margin" double precision DEFAULT 100 NOT NULL,
	"labor_cost_per_hour" double precision DEFAULT 5 NOT NULL,
	"kwh_cost" double precision DEFAULT 0.9 NOT NULL,
	"printer_purchase_price" double precision DEFAULT 1200 NOT NULL,
	"printer_lifespan_hours" double precision DEFAULT 6000 NOT NULL,
	"printer_power_watts" double precision DEFAULT 150 NOT NULL,
	"selected_printer_id" text,
	"admin_whatsapp" text
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"material_id" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"password_hint" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"cpf" text,
	"birthdate" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
