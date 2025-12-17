import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveChatAndMessages1734528000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop conversations table (has foreign key to messages)
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations" CASCADE`)

    // Drop messages table
    await queryRunner.query(`DROP TABLE IF EXISTS "messages" CASCADE`)
  }

  public async down(): Promise<void> {
    // This migration is intentionally irreversible
    // The chat and messages system has been completely removed from the codebase
    throw new Error(
      'This migration cannot be reverted. The chat and messages modules have been removed.'
    )
  }
}
