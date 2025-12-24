import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveAssessmentSharing1735000000000 implements MigrationInterface {
  name = 'RemoveAssessmentSharing1735000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the assessment_shares table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "assessment_shares" CASCADE
    `)

    // Remove the is_shared_with_all column from assessments table
    await queryRunner.query(`
      ALTER TABLE "assessments"
      DROP COLUMN IF EXISTS "is_shared_with_all"
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the is_shared_with_all column
    await queryRunner.query(`
      ALTER TABLE "assessments"
      ADD COLUMN "is_shared_with_all" boolean NOT NULL DEFAULT false
    `)

    // Recreate the assessment_shares table
    await queryRunner.query(`
      CREATE TABLE "assessment_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessment_id" uuid NOT NULL,
        "shared_with_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assessment_shares_assessment_user" UNIQUE ("assessment_id", "shared_with_user_id")
      )
    `)

    // Recreate foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      ADD CONSTRAINT "FK_assessment_shares_assessment"
      FOREIGN KEY ("assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      ADD CONSTRAINT "FK_assessment_shares_user"
      FOREIGN KEY ("shared_with_user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `)

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_shares_assessment_id"
      ON "assessment_shares" ("assessment_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_shares_shared_with_user_id"
      ON "assessment_shares" ("shared_with_user_id")
    `)
  }
}
