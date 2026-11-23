CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"metric" text NOT NULL,
	"chart" text NOT NULL,
	"range_days" integer NOT NULL,
	"bucket" text NOT NULL,
	"exercise_id" uuid,
	"activity_type_id" uuid
);
--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dashboard_widgets_user_idx" ON "dashboard_widgets" USING btree ("user_id","position");