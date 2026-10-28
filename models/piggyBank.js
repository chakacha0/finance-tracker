"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PiggyBank extends Model {
    static associate(models) {
      PiggyBank.hasMany(models.PiggyDeposit, {
        foreignKey: "piggyBankId",
        as: "deposits",
      });
      PiggyBank.hasMany(models.PiggyMember, {
        foreignKey: "piggyBankId",
        as: "members",
      });
    }
  }

  PiggyBank.init(
    {
      name: { type: DataTypes.STRING(60), allowNull: false },
      goal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      current: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdBy: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "",
      },
      // код приглашения: по нему другие пользователи вступают в копилку
      code: { type: DataTypes.STRING(8), allowNull: false, unique: true },
    },
    { sequelize, modelName: "PiggyBank", tableName: "PiggyBanks" },
  );

  return PiggyBank;
};
