import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateContactMessages1735200000000 implements MigrationInterface {
  name = 'CreateContactMessages1735200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const table = await queryRunner.getTable('contact_messages')
    if (table) {
      return
    }

    // Create contact_messages table
    await queryRunner.query(`
      CREATE TABLE "contact_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "subject" varchar(500),
        "message" text NOT NULL,
        "type" varchar(50) NOT NULL DEFAULT 'general',
        "user_id" uuid,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "admin_response" text,
        "responded_at" timestamptz,
        "responded_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact_messages" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_contact_messages_type" CHECK ("type" IN ('general', 'suspended', 'feedback', 'support')),
        CONSTRAINT "CHK_contact_messages_status" CHECK ("status" IN ('pending', 'in_progress', 'resolved', 'closed'))
      )
    `)

    // Create foreign key to users table (user_id)
    await queryRunner.query(`
      ALTER TABLE "contact_messages"
      ADD CONSTRAINT "FK_contact_messages_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // Create foreign key to users table (responded_by)
    await queryRunner.query(`
      ALTER TABLE "contact_messages"
      ADD CONSTRAINT "FK_contact_messages_responded_by"
      FOREIGN KEY ("responded_by")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `)

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_contact_messages_user_id"
      ON "contact_messages"("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_contact_messages_status"
      ON "contact_messages"("status")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_contact_messages_type"
      ON "contact_messages"("type")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_contact_messages_created_at"
      ON "contact_messages"("created_at")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contact_messages_created_at"
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contact_messages_type"
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contact_messages_status"
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_contact_messages_user_id"
    `)

    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "contact_messages"
      DROP CONSTRAINT IF EXISTS "FK_contact_messages_responded_by"
    `)

    await queryRunner.query(`
      ALTER TABLE "contact_messages"
      DROP CONSTRAINT IF EXISTS "FK_contact_messages_user_id"
    `)

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "contact_messages"
    `)
  }
}

