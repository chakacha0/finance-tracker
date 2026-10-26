require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const transactionsRouter = require("./routes/transactions");
const Transaction = require("./models/transaction");

const app = express();

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = 3000;

const cors = require("cors");
app.use(cors());

app.use("/transactions", require("./routes/transactions"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Пупупу что-то не так с сервером" });
});

app.listen(PORT, () => {
  console.log(`я работаю на http://localhost:${PORT}`);
});
