import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateGenAIUsageTracking1735300000001 implements MigrationInterface {
  name = 'CreateGenAIUsageTracking1735300000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "genai_api_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_name" character varying(100) NOT NULL,
        "operation" character varying(100) NOT NULL,
        "model_name" character varying(100) NOT NULL,
        "user_id" uuid,
        "input_tokens" integer,
        "output_tokens" integer,
        "total_tokens" integer,
        "duration_ms" integer,
        "success" boolean NOT NULL DEFAULT true,
        "error_message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_genai_api_usage" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_genai_api_usage_service_created" 
      ON "genai_api_usage" ("service_name", "created_at")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_genai_api_usage_user_created" 
      ON "genai_api_usage" ("user_id", "created_at")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_genai_api_usage_success_created" 
      ON "genai_api_usage" ("success", "created_at")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_genai_api_usage_model_created" 
      ON "genai_api_usage" ("model_name", "created_at")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_genai_api_usage_created_at" 
      ON "genai_api_usage" ("created_at")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_genai_api_usage_created_at"`)
    await queryRunner.query(`DROP INDEX "IDX_genai_api_usage_model_created"`)
    await queryRunner.query(`DROP INDEX "IDX_genai_api_usage_success_created"`)
    await queryRunner.query(`DROP INDEX "IDX_genai_api_usage_user_created"`)
    await queryRunner.query(`DROP INDEX "IDX_genai_api_usage_service_created"`)
    await queryRunner.query(`DROP TABLE "genai_api_usage"`)
  }
}
