const express = require("express");
const router = express.Router();
const { Transaction } = require("../models");
const { Op, fn, col, literal } = require("sequelize");
const authMiddleware = require("../middleware/auth");

// Все роуты ниже доступны только с токеном, и работают только с данными владельца
router.use(authMiddleware);

// поля, которые можно менять через PUT (userId и id менять нельзя)
const pickEditable = (body) => {
  const result = {};
  for (const key of ["amount", "type", "category", "description", "date"]) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
};

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const where = { userId: req.user.id };

    if (search && search.trim()) {
      const safe = search.trim().replace(/[\\%_]/g, "\\$&");
      const pattern = `%${safe}%`;
      where[Op.or] = [
        { description: { [Op.iLike]: pattern } },
        { category: { [Op.iLike]: pattern } },
      ];
    }

    const transactions = await Transaction.findAll({
      where,
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
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
      userId: req.user.id, // берём из токена, а не из тела запроса
    });

    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!transaction) {
      return res.status(404).json({ error: "Нечего обновлять, ID не найден" });
    }

    await transaction.update(pickEditable(req.body));
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Transaction.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ error: "Транзакция не найдена, удалять нечего" });
    }

    res.json({ message: "Транзакция удалена успешно" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/balance", async (req, res) => {
  try {
    const result = await Transaction.findAll({
      where: { userId: req.user.id },
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
    const stats = await Transaction.findAll({
      where: { userId: req.user.id },
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
    const stats = await Transaction.findAll({
      where: { userId: req.user.id },
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
