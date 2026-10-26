const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/transaction");

const router = express.Router();

const checkId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Некорректный id" });
  }
  next();
};

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json({ message: "Удалено" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Заметки (массив вложенных документов) ----------

// POST /transactions/:id/notes - добавить заметку
router.post("/:id/notes", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { text: req.body.text } } },
      { returnDocument: "after", runValidators: true },
    );
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/notes/:noteId", checkId, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.noteId)) {
      return res.status(400).json({ error: "Некорректный noteId" });
    }
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, "notes._id": req.params.noteId },
      { $set: { "notes.$.text": req.body.text } },
      { returnDocument: "after", runValidators: true },
    );
    if (!transaction)
      return res
        .status(404)
        .json({ error: "Транзакция или заметка не найдена" });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id/notes/:noteId", checkId, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.noteId)) {
      return res.status(400).json({ error: "Некорректный noteId" });
    }
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $pull: { notes: { _id: req.params.noteId } } },
      { returnDocument: "after" },
    );
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/tags", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { tags: req.body.tag } },
      { returnDocument: "after" },
    );
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id/tags/:tag", checkId, async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $pull: { tags: req.params.tag } },
      { returnDocument: "after" },
    );
    if (!transaction) return res.status(404).json({ error: "Не найдено" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
