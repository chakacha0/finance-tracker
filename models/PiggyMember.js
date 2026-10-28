"use strict";
const { Model } = require("sequelize");

// Участник копилки: запись «пользователь X состоит в копилке Y»
module.exports = (sequelize, DataTypes) => {
  class PiggyMember extends Model {
    static associate(models) {
      PiggyMember.belongsTo(models.PiggyBank, {
        foreignKey: "piggyBankId",
        as: "piggyBank",
      });
      PiggyMember.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  PiggyMember.init(
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      piggyBankId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "PiggyMember", tableName: "PiggyMembers" },
  );

  return PiggyMember;
};
