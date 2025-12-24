import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAssessmentRetakeSupport1735100000000 implements MigrationInterface {
  name = 'AddAssessmentRetakeSupport1735100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if original_assessment_id column exists before adding
    const assessmentsTable = await queryRunner.getTable('assessments')
    const hasOriginalAssessmentId = assessmentsTable?.findColumnByName(
      'original_assessment_id'
    )

    // Add original_assessment_id column to assessments table (nullable, self-referencing)
    if (!hasOriginalAssessmentId) {
      await queryRunner.query(`
        ALTER TABLE "assessments"
        ADD COLUMN "original_assessment_id" uuid
      `)
    }

    // Check if attempt_number column exists before adding
    const hasAttemptNumber =
      assessmentsTable?.findColumnByName('attempt_number')

    // Add attempt_number column to assessments table (default 1)
    if (!hasAttemptNumber) {
      await queryRunner.query(`
        ALTER TABLE "assessments"
        ADD COLUMN "attempt_number" integer NOT NULL DEFAULT 1
      `)
    }

    // Check if foreign key constraint exists before adding
    const hasForeignKey = assessmentsTable?.foreignKeys.find(
      (fk) => fk.name === 'FK_assessments_original_assessment'
    )

    // Add foreign key constraint for original_assessment_id
    if (!hasForeignKey) {
      await queryRunner.query(`
        ALTER TABLE "assessments"
        ADD CONSTRAINT "FK_assessments_original_assessment"
        FOREIGN KEY ("original_assessment_id")
        REFERENCES "assessments"("id")
        ON DELETE CASCADE
      `)
    }

    // Check if index exists before creating
    const indexResult = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'IDX_assessments_original_assessment_id'
      ) as exists
    `)) as Array<{ exists: boolean }>

    // Create index on original_assessment_id for faster queries
    if (!indexResult[0]?.exists) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_assessments_original_assessment_id"
        ON "assessments"("original_assessment_id")
      `)
    }

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
