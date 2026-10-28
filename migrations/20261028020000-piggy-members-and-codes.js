'use strict';
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов (0/O, 1/I)
const makeCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. код приглашения у копилок (старым копилкам выдаём коды)
    await queryInterface.addColumn('PiggyBanks', 'code', {
      type: Sequelize.STRING(8),
      allowNull: true,
    });

    const [rows] = await queryInterface.sequelize.query('SELECT id FROM "PiggyBanks"');
    const used = new Set();
    for (const row of rows) {
      let code;
      do {
        code = makeCode();
      } while (used.has(code));
      used.add(code);
      await queryInterface.sequelize.query('UPDATE "PiggyBanks" SET code = :code WHERE id = :id', {
        replacements: { code, id: row.id },
      });
    }

    await queryInterface.changeColumn('PiggyBanks', 'code', {
      type: Sequelize.STRING(8),
      allowNull: false,
    });
    await queryInterface.addIndex('PiggyBanks', ['code'], {
      unique: true,
      name: 'piggy_banks_code_unique',
    });

    // 2. участники копилок
    await queryInterface.createTable('PiggyMembers', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      piggyBankId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PiggyBanks', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('PiggyMembers', ['userId', 'piggyBankId'], {
      unique: true,
      name: 'piggy_members_user_bank_unique',
    });

    // 3. кто внёс взнос (id пользователя)
    await queryInterface.addColumn('PiggyDeposits', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('PiggyDeposits', 'userId');
    await queryInterface.dropTable('PiggyMembers');
    await queryInterface.removeIndex('PiggyBanks', 'piggy_banks_code_unique');
    await queryInterface.removeColumn('PiggyBanks', 'code');
  },
};
