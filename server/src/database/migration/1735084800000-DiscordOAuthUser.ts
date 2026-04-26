import type { MigrationInterface, QueryRunner } from 'typeorm'

export class DiscordOAuthUser1735084800000 implements MigrationInterface {
  name = 'DiscordOAuthUser1735084800000'

  async up (queryRunner: QueryRunner): Promise<void> {
    const type = queryRunner.connection.options.type
    if (type === 'mysql' || type === 'mariadb') {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `discordId` varchar(255) NULL',
      )
      await queryRunner.query(
        'ALTER TABLE `users` ADD UNIQUE INDEX `IDX_users_discordId` (`discordId`)',
      )
      await queryRunner.query(
        'ALTER TABLE `users` MODIFY `password` text NULL',
      )
    }
  }

  async down (queryRunner: QueryRunner): Promise<void> {
    const type = queryRunner.connection.options.type
    if (type === 'mysql' || type === 'mariadb') {
      await queryRunner.query('ALTER TABLE `users` DROP INDEX `IDX_users_discordId`')
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `discordId`')
      await queryRunner.query('ALTER TABLE `users` MODIFY `password` text NOT NULL')
    }
  }
}
