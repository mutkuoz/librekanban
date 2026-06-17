CREATE TABLE "card_dependencies" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_dependencies_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_blocker_id_cards_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_blocked_id_cards_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_deps_blocked_idx" ON "card_dependencies" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "card_deps_blocker_idx" ON "card_dependencies" USING btree ("blocker_id");