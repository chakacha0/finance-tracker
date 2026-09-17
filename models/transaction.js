"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {}
  }
  Transaction.init(
    {
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("income", "expense"),
        allowNull: false,
      },
      category: DataTypes.STRING,
      description: DataTypes.STRING,
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Transaction",
    },
  );
  return Transaction;
};
