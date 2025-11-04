import { MigrationInterface, QueryRunner, Table } from 'typeorm'

export class AddRoadmapSharing1730745600000 implements MigrationInterface {
  name = 'AddRoadmapSharing1730745600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "roadmaps" ADD "is_shared_with_all" boolean NOT NULL DEFAULT false'
    )

    await queryRunner.createTable(
      new Table({
        name: 'roadmap_shares',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'roadmap_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'shared_with_user_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'created_at',
            type: 'TIMESTAMP WITH TIME ZONE',
            default: 'CURRENT_TIMESTAMP'
          }
        ],
        uniques: [
          {
            name: 'UQ_roadmap_shares_roadmap_user',
            columnNames: ['roadmap_id', 'shared_with_user_id']
          }
        ],
        foreignKeys: [
          {
            name: 'FK_roadmap_shares_roadmap',
            columnNames: ['roadmap_id'],
            referencedTableName: 'roadmaps',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            name: 'FK_roadmap_shares_user',
            columnNames: ['shared_with_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      })
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('roadmap_shares')
    await queryRunner.query(
      'ALTER TABLE "roadmaps" DROP COLUMN "is_shared_with_all"'
    )
  }
}
