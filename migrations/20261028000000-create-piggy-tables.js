'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PiggyBanks', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      name: { type: Sequelize.STRING(60), allowNull: false },
      goal: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      current: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      createdBy: { type: Sequelize.STRING(40), allowNull: false, defaultValue: '' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable('PiggyDeposits', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      piggyBankId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PiggyBanks', key: 'id' },
        onDelete: 'CASCADE',
      },
      userName: { type: Sequelize.STRING(40), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PiggyDeposits');
    await queryInterface.dropTable('PiggyBanks');
  },
};
