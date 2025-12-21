import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateApplicationDocuments1734700000000 implements MigrationInterface {
  name = 'CreateApplicationDocuments1734700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create document type enum
    await queryRunner.query(`
      CREATE TYPE "public"."document_type_enum" AS ENUM(
        'certificate',
        'award',
        'portfolio',
        'recommendation',
        'other'
      )
    `)

    // Create verification status enum
    await queryRunner.query(`
      CREATE TYPE "public"."document_verification_status_enum" AS ENUM(
        'pending',
        'verified',
        'rejected'
      )
    `)

    // Create application_documents table
    await queryRunner.query(`
      CREATE TABLE "application_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "type" "public"."document_type_enum" NOT NULL DEFAULT 'other',
        "original_filename" character varying NOT NULL,
        "stored_filename" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "file_size" integer NOT NULL,
        "file_path" character varying NOT NULL,
        "title" character varying(200),
        "description" text,
        "issued_year" integer,
        "issuing_organization" character varying(255),
        "verification_status" "public"."document_verification_status_enum" NOT NULL DEFAULT 'pending',
        "verification_notes" text,
        "verified_by" uuid,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_documents" PRIMARY KEY ("id")
      )
    `)

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_application_documents_application_id" 
      ON "application_documents" ("application_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_application_documents_type" 
      ON "application_documents" ("type")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_application_documents_verification_status" 
      ON "application_documents" ("verification_status")
    `)

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      ADD CONSTRAINT "FK_application_documents_application" 
      FOREIGN KEY ("application_id") 
      REFERENCES "mentor_applications"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      ADD CONSTRAINT "FK_application_documents_uploader" 
      FOREIGN KEY ("uploaded_by") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      ADD CONSTRAINT "FK_application_documents_verifier" 
      FOREIGN KEY ("verified_by") 
      REFERENCES "users"("id") 
      ON DELETE SET NULL 
      ON UPDATE NO ACTION
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      DROP CONSTRAINT "FK_application_documents_verifier"
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      DROP CONSTRAINT "FK_application_documents_uploader"
    `)

    await queryRunner.query(`
      ALTER TABLE "application_documents" 
      DROP CONSTRAINT "FK_application_documents_application"
    `)

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "public"."IDX_application_documents_verification_status"
    `)

    await queryRunner.query(`
      DROP INDEX "public"."IDX_application_documents_type"
    `)

    await queryRunner.query(`
      DROP INDEX "public"."IDX_application_documents_application_id"
    `)

    // Drop table
    await queryRunner.query(`DROP TABLE "application_documents"`)

    // Drop enums
    await queryRunner.query(`
      DROP TYPE "public"."document_verification_status_enum"
    `)

    await queryRunner.query(`DROP TYPE "public"."document_type_enum"`)
  }
}
