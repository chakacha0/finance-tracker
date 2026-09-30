const express = require("express");
const router = express.Router();
const { Transaction } = require("../models");

router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Транзакция не найдена" });
    }
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { amount, type, category, description, date } = req.body;

    if (!amount || !type) {
      return res
        .status(400)
        .json({ error: "Поля 'amount' и 'type' обязательны" });
    }

    const newTransaction = await Transaction.create({
      amount,
      type,
      category,
      description,
      date: date || new Date().toISOString().split("T")[0],
    });

    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Нечего обновлять, ID не найден" });
    }

    await Transaction.update(req.body, { where: { id: req.params.id } });
    const updated = await Transaction.findByPk(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      return res
        .status(404)
        .json({ error: "Транзакция не найдена, удалять нечего" });
    }

    await Transaction.destroy({ where: { id: req.params.id } });
    res.json({ message: "Транзакция удалена успешно" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/balance", async (req, res) => {
  try {
    const { fn, col, literal } = require("sequelize");

    const result = await Transaction.findAll({
      attributes: [
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'income' THEN amount ELSE 0 END`),
          ),
          "totalIncome",
        ],
        [
          fn(
            "SUM",
            literal(`CASE WHEN type = 'expense' THEN amount ELSE 0 END`),
          ),
          "totalExpense",
        ],
      ],
      raw: true,
    });

    const totalIncome = parseFloat(result[0].totalIncome) || 0;
    const totalExpense = parseFloat(result[0].totalExpense) || 0;

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/by-category", async (req, res) => {
  try {
    const { fn, col, literal } = require("sequelize");

    const stats = await Transaction.findAll({
      attributes: [
        "category",
        "type",
        [fn("SUM", col("amount")), "total"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: ["category", "type"],
      order: [[literal("total"), "DESC"]],
      raw: true,
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/monthly", async (req, res) => {
  try {
    const { fn, col, literal } = require("sequelize");

    const stats = await Transaction.findAll({
      attributes: [
        [fn("to_char", col("date"), "YYYY-MM"), "month"],
        "type",
        [fn("SUM", col("amount")), "total"],
      ],
      group: [literal("month"), "type"],
      order: [[literal("month"), "ASC"]],
      raw: true,
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
