import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAssessmentRetakeSupport1735100000000 implements MigrationInterface {
  name = 'AddAssessmentRetakeSupport1735100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add original_assessment_id column to assessments table (nullable, self-referencing)
    await queryRunner.query(`
      ALTER TABLE "assessments"
      ADD COLUMN "original_assessment_id" uuid
    `)

    // Add attempt_number column to assessments table (default 1)
    await queryRunner.query(`
      ALTER TABLE "assessments"
      ADD COLUMN "attempt_number" integer NOT NULL DEFAULT 1
    `)

    // Add foreign key constraint for original_assessment_id
    await queryRunner.query(`
      ALTER TABLE "assessments"
      ADD CONSTRAINT "FK_assessments_original_assessment"
      FOREIGN KEY ("original_assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
    `)

    // Create index on original_assessment_id for faster queries
    await queryRunner.query(`
      CREATE INDEX "IDX_assessments_original_assessment_id"
      ON "assessments"("original_assessment_id")
    `)

    // Remove unique constraint from assessment_id in assessment_results
    await queryRunner.query(`
      ALTER TABLE "assessment_results"
      DROP CONSTRAINT IF EXISTS "UQ_assessment_results_assessment_id"
    `)

    // Drop the unique index if it exists (TypeORM creates this automatically)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_assessment_results_assessment_id"
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add unique constraint to assessment_id in assessment_results
    await queryRunner.query(`
      ALTER TABLE "assessment_results"
      ADD CONSTRAINT "UQ_assessment_results_assessment_id"
      UNIQUE ("assessment_id")
    `)

    // Drop index on original_assessment_id
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_assessments_original_assessment_id"
    `)

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "assessments"
      DROP CONSTRAINT IF EXISTS "FK_assessments_original_assessment"
    `)

    // Remove attempt_number column
    await queryRunner.query(`
      ALTER TABLE "assessments"
      DROP COLUMN IF EXISTS "attempt_number"
    `)

    // Remove original_assessment_id column
    await queryRunner.query(`
      ALTER TABLE "assessments"
      DROP COLUMN IF EXISTS "original_assessment_id"
    `)
  }
}
