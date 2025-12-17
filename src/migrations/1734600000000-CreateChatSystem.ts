import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateChatSystem1734600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "mentorship_id" uuid NOT NULL UNIQUE,
        "participant1_id" uuid NOT NULL,
        "participant2_id" uuid NOT NULL,
        "last_message_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_conversations_mentorship" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_conversations_participant1" FOREIGN KEY ("participant1_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_conversations_participant2" FOREIGN KEY ("participant2_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_conversations_mentorship_id" ON "conversations" ("mentorship_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_conversations_participants" ON "conversations" ("participant1_id", "participant2_id")
    `)

    // Create message_type enum
    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM ('text', 'system')
    `)

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "type" "message_type_enum" NOT NULL DEFAULT 'text',
        "content" text NOT NULL,
        "parent_message_id" uuid,
        "is_edited" boolean NOT NULL DEFAULT false,
        "edited_at" timestamptz,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamptz,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_messages_parent" FOREIGN KEY ("parent_message_id") REFERENCES "messages"("id") ON DELETE SET NULL
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_messages_conversation_created" ON "messages" ("conversation_id", "created_at" DESC)
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_messages_sender" ON "messages" ("sender_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_messages_parent" ON "messages" ("parent_message_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE`)
    await queryRunner.query(`DROP TYPE IF EXISTS "message_type_enum"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations" CASCADE`)
  }
}
