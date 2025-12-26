import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMentorReviews1735300000000 implements MigrationInterface {
  name = 'CreateMentorReviews1735300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('mentor_reviews')
    if (table) {
      return
    }

    await queryRunner.query(`
      CREATE TABLE "mentor_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mentor_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "mentorship_id" uuid,
        "rating" integer NOT NULL,
        "feedback" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mentor_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_mentor_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_mentor_reviews_mentor_student" UNIQUE ("mentor_id", "student_id")
      )
    `)

    // Create foreign key to users table (mentor_id)
    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      ADD CONSTRAINT "FK_mentor_reviews_mentor_id"
      FOREIGN KEY ("mentor_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `)

    // Create foreign key to users table (student_id)
    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      ADD CONSTRAINT "FK_mentor_reviews_student_id"
      FOREIGN KEY ("student_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `)

    // Create foreign key to mentorships table (mentorship_id)
    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      ADD CONSTRAINT "FK_mentor_reviews_mentorship_id"
      FOREIGN KEY ("mentorship_id")
      REFERENCES "mentorships"("id")
      ON DELETE SET NULL
    `)

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_mentor_reviews_mentor_id"
      ON "mentor_reviews"("mentor_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_mentor_reviews_student_id"
      ON "mentor_reviews"("student_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_mentor_reviews_mentorship_id"
      ON "mentor_reviews"("mentorship_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_mentor_reviews_mentorship_id"
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_mentor_reviews_student_id"
    `)

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_mentor_reviews_mentor_id"
    `)

    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      DROP CONSTRAINT IF EXISTS "FK_mentor_reviews_mentorship_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      DROP CONSTRAINT IF EXISTS "FK_mentor_reviews_student_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "mentor_reviews"
      DROP CONSTRAINT IF EXISTS "FK_mentor_reviews_mentor_id"
    `)

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "mentor_reviews"
    `)
  }
}
