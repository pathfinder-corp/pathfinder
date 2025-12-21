import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddImageKitColumnsToDocuments1734800000000
  implements MigrationInterface
{
  name = 'AddImageKitColumnsToDocuments1734800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ImageKit columns to application_documents table
    await queryRunner.query(`
      ALTER TABLE "application_documents"
      ADD COLUMN IF NOT EXISTS "imagekit_file_id" varchar(255) NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents"
      ADD COLUMN IF NOT EXISTS "imagekit_url" varchar(500) NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents"
      ADD COLUMN IF NOT EXISTS "imagekit_path" varchar(500) NULL
    `)

    // Make file_path nullable (since new documents will use ImageKit)
    await queryRunner.query(`
      ALTER TABLE "application_documents"
      ALTER COLUMN "file_path" DROP NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove ImageKit columns
    await queryRunner.query(`
      ALTER TABLE "application_documents"
      DROP COLUMN IF EXISTS "imagekit_path"
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents"
      DROP COLUMN IF EXISTS "imagekit_url"
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents"
      DROP COLUMN IF EXISTS "imagekit_file_id"
    `)

    // Note: We don't restore NOT NULL on file_path as it would break existing data
  }
}

