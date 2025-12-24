import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveStudentPreferences1735200000000 implements MigrationInterface {
  name = 'RemoveStudentPreferences1735200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove audit log entries for student preferences
    await queryRunner.query(
      `DELETE FROM "audit_logs" WHERE "action" = 'preferences_updated'`
    )

    // Drop the student_preferences table
    await queryRunner.query(`DROP TABLE IF EXISTS "student_preferences"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the student_preferences table
    await queryRunner.query(`
      CREATE TABLE "student_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "preferences" jsonb NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_preferences" PRIMARY KEY ("id")
      )
    `)

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_student_preferences_userId_version" 
      ON "student_preferences" ("userId", "version")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_student_preferences_userId_createdAt" 
      ON "student_preferences" ("userId", "createdAt")
    `)

    // Recreate foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "student_preferences" 
      ADD CONSTRAINT "FK_student_preferences_userId" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `)

    // Note: Cannot restore deleted audit log entries
  }
}
