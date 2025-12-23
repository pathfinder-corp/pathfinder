import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMessageAttachments1734900000000 implements MigrationInterface {
  name = 'AddMessageAttachments1734900000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_url" text NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_thumbnail_url" text NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_file_id" text NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_file_name" text NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_mime_type" text NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "attachment_size" bigint NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_size"
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_mime_type"
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_file_name"
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_file_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_thumbnail_url"
    `)

    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "attachment_url"
    `)
  }
}
