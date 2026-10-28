"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Transactions", "userId", {
      type: Sequelize.INTEGER,
      allowNull: true, // старые записи останутся без владельца
      references: { model: "Users", key: "id" },
      onDelete: "CASCADE", // удалили пользователя - удалились его транзакции
      onUpdate: "CASCADE",
    });
    await queryInterface.addIndex("Transactions", ["userId"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Transactions", ["userId"]);
    await queryInterface.removeColumn("Transactions", "userId");
  },
};
