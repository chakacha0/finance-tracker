require("dotenv").config();
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const transactionsRouter = require("./routes/transactions");
const userAuthRouter = require("./routes/userAuth");
const userProfileRouter = require("./routes/userProfile");
const { Transaction } = require("./models");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(expressLayouts);
app.set("layout", "layout");



app.use("/transactions", transactionsRouter);
app.use("/auth", userAuthRouter);
app.use("/profile", userProfileRouter);
app.use(express.static("public"));

app.locals.formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
app.get("/", async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({ raw: true });
    res.render("index", { transactions });
  } catch (err) {
    next(err);
  }
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Пупупу что-то не так с сервером" });
});

app.get("/item/:id", async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, { raw: true });
    if (!transaction) {
      return res.status(404).send("Транзакция не найдена");
    }
    res.render("item", { transaction });
  } catch (err) {
    next(err);
  }
});

app.get("/add", (req, res) => {
  res.render("add");
});

app.post("/add", async (req, res, next) => {
  try {
    const { amount, type, category, description, date } = req.body;

    if (!amount || !type) {
      return res.status(400).send("Поля «Сумма» и «Тип» обязательны");
    }

    await Transaction.create({
      amount,
      type,
      category,
      description,
      date: date || new Date().toISOString().split("T")[0],
    });

    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`я работаю на http://localhost:${PORT}`);
});
