import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddProgressTrackingAndGamification1735400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roadmap_progress table
    await queryRunner.query(`
      CREATE TABLE "roadmap_progress" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "roadmap_id" uuid NOT NULL REFERENCES "roadmaps"("id") ON DELETE CASCADE,
        "phases" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "milestones" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "overall_progress" numeric(5,2) NOT NULL DEFAULT 0,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("user_id", "roadmap_id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_roadmap_progress_user_id" ON "roadmap_progress"("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_roadmap_progress_roadmap_id" ON "roadmap_progress"("roadmap_id")
    `)

    // Create user_gamification table
    await queryRunner.query(`
      CREATE TYPE "badge_type_enum" AS ENUM (
        'first_roadmap',
        'roadmap_complete',
        'phase_master',
        'week_streak',
        'month_streak',
        'early_bird',
        'night_owl',
        'consistent_learner',
        'speed_learner',
        'milestone_achiever'
      )
    `)

    await queryRunner.query(`
      CREATE TYPE "badge_tier_enum" AS ENUM (
        'bronze',
        'silver',
        'gold',
        'platinum',
        'diamond'
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "user_gamification" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "total_xp" integer NOT NULL DEFAULT 0,
        "level" integer NOT NULL DEFAULT 1,
        "current_streak" integer NOT NULL DEFAULT 0,
        "longest_streak" integer NOT NULL DEFAULT 0,
        "last_activity_date" date,
        "roadmaps_completed" integer NOT NULL DEFAULT 0,
        "phases_completed" integer NOT NULL DEFAULT 0,
        "steps_completed" integer NOT NULL DEFAULT 0,
        "milestones_completed" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_gamification_user_id" ON "user_gamification"("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_gamification_total_xp" ON "user_gamification"("total_xp" DESC)
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_gamification_level" ON "user_gamification"("level" DESC)
    `)

    // Create user_badges table
    await queryRunner.query(`
      CREATE TABLE "user_badges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" badge_type_enum NOT NULL,
        "tier" badge_tier_enum NOT NULL DEFAULT 'bronze',
        "title" varchar(100) NOT NULL,
        "description" text NOT NULL,
        "icon_name" varchar(50) NOT NULL,
        "xp_awarded" integer NOT NULL DEFAULT 0,
        "earned_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("user_id", "type", "tier")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_badges_user_id" ON "user_badges"("user_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_badges_type" ON "user_badges"("type")
    `)

    await queryRunner.query(`
      CREATE INDEX "idx_user_badges_earned_at" ON "user_badges"("earned_at" DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "user_badges"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "user_gamification"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "roadmap_progress"`)

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "badge_tier_enum"`)
    await queryRunner.query(`DROP TYPE IF EXISTS "badge_type_enum"`)
  }
}
