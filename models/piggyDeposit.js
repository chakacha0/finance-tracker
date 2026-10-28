"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PiggyDeposit extends Model {
    static associate(models) {
      PiggyDeposit.belongsTo(models.PiggyBank, {
        foreignKey: "piggyBankId",
        as: "piggyBank",
      });
    }
  }

  PiggyDeposit.init(
    {
      piggyBankId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      userName: { type: DataTypes.STRING(40), allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    { sequelize, modelName: "PiggyDeposit", tableName: "PiggyDeposits" },
  );

  return PiggyDeposit;
};
