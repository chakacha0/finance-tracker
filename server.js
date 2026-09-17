require('dotenv').config();
const express = require("express");
const transactionsRouter = require('./routes/transactions');

const app = express();
app.use(express.json());

const PORT = 3000;

app.use('/transactions', transactionsRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Пупупу что-то не так с сервером" });
});

app.listen(PORT, () => {
  console.log(`я работаю на http://localhost:${PORT}`);
});