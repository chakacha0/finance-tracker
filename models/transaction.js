const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const transactionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: String,
    description: String,
    date: { type: Date, required: true },
    tags: [String],
    notes: [noteSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
