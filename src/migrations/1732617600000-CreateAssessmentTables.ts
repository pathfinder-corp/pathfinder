import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAssessmentTables1732617600000
  implements MigrationInterface
{
  name = 'CreateAssessmentTables1732617600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create assessments table
    await queryRunner.query(`
      CREATE TYPE "assessment_difficulty_enum" AS ENUM ('easy', 'medium', 'hard');
    `)

    await queryRunner.query(`
      CREATE TYPE "assessment_status_enum" AS ENUM ('pending', 'in_progress', 'completed');
    `)

    await queryRunner.query(`
      CREATE TABLE "assessments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "domain" character varying NOT NULL,
        "difficulty" "assessment_difficulty_enum" NOT NULL DEFAULT 'medium',
        "question_count" integer NOT NULL DEFAULT 15,
        "status" "assessment_status_enum" NOT NULL DEFAULT 'pending',
        "is_shared_with_all" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessments" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessments_user_id" ON "assessments" ("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessments_status" ON "assessments" ("status")
    `)

    // Create assessment_questions table
    await queryRunner.query(`
      CREATE TABLE "assessment_questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessment_id" uuid NOT NULL,
        "question_text" text NOT NULL,
        "options" jsonb NOT NULL,
        "correct_answer_index" integer NOT NULL,
        "explanation" text NOT NULL,
        "order_index" integer NOT NULL,
        "resources" jsonb,
        CONSTRAINT "PK_assessment_questions" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_questions_assessment_id" ON "assessment_questions" ("assessment_id")
    `)

    // Create assessment_responses table
    await queryRunner.query(`
      CREATE TABLE "assessment_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessment_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "selected_answer_index" integer NOT NULL,
        "is_correct" boolean NOT NULL,
        "time_spent" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment_responses" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_responses_assessment_id" ON "assessment_responses" ("assessment_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_responses_question_id" ON "assessment_responses" ("question_id")
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_assessment_responses_unique" ON "assessment_responses" ("assessment_id", "question_id")
    `)

    // Create assessment_results table
    await queryRunner.query(`
      CREATE TABLE "assessment_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessment_id" uuid NOT NULL,
        "score" numeric(5,2) NOT NULL,
        "correct_count" integer NOT NULL,
        "total_questions" integer NOT NULL,
        "summary" jsonb NOT NULL,
        "suggested_roadmaps" jsonb,
        "completed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment_results" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assessment_results_assessment_id" UNIQUE ("assessment_id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_results_assessment_id" ON "assessment_results" ("assessment_id")
    `)

    // Create assessment_shares table
    await queryRunner.query(`
      CREATE TABLE "assessment_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "assessment_id" uuid NOT NULL,
        "shared_with_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assessment_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assessment_shares" UNIQUE ("assessment_id", "shared_with_user_id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_shares_assessment_id" ON "assessment_shares" ("assessment_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_shares_shared_with_user_id" ON "assessment_shares" ("shared_with_user_id")
    `)

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "assessments"
      ADD CONSTRAINT "FK_assessments_user_id"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_questions"
      ADD CONSTRAINT "FK_assessment_questions_assessment_id"
      FOREIGN KEY ("assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_responses"
      ADD CONSTRAINT "FK_assessment_responses_assessment_id"
      FOREIGN KEY ("assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_responses"
      ADD CONSTRAINT "FK_assessment_responses_question_id"
      FOREIGN KEY ("question_id")
      REFERENCES "assessment_questions"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_results"
      ADD CONSTRAINT "FK_assessment_results_assessment_id"
      FOREIGN KEY ("assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      ADD CONSTRAINT "FK_assessment_shares_assessment_id"
      FOREIGN KEY ("assessment_id")
      REFERENCES "assessments"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      ADD CONSTRAINT "FK_assessment_shares_shared_with_user_id"
      FOREIGN KEY ("shared_with_user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      DROP CONSTRAINT "FK_assessment_shares_shared_with_user_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_shares"
      DROP CONSTRAINT "FK_assessment_shares_assessment_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_results"
      DROP CONSTRAINT "FK_assessment_results_assessment_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_responses"
      DROP CONSTRAINT "FK_assessment_responses_question_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_responses"
      DROP CONSTRAINT "FK_assessment_responses_assessment_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessment_questions"
      DROP CONSTRAINT "FK_assessment_questions_assessment_id"
    `)

    await queryRunner.query(`
      ALTER TABLE "assessments"
      DROP CONSTRAINT "FK_assessments_user_id"
    `)

    // Drop tables
    await queryRunner.query(`DROP TABLE "assessment_shares"`)
    await queryRunner.query(`DROP TABLE "assessment_results"`)
    await queryRunner.query(`DROP TABLE "assessment_responses"`)
    await queryRunner.query(`DROP TABLE "assessment_questions"`)
    await queryRunner.query(`DROP TABLE "assessments"`)

    // Drop enums
    await queryRunner.query(`DROP TYPE "assessment_status_enum"`)
    await queryRunner.query(`DROP TYPE "assessment_difficulty_enum"`)
  }
}


