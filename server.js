require("dotenv").config();
const express = require("express");
const transactionsRouter = require("./routes/transactions");
const userAuthRouter = require("./routes/userAuth");
const userProfileRouter = require("./routes/userProfile");
const http = require("http");
const initSockets = require("./sockets");

const app = express();
app.use(express.json());

const PORT = 3000;

const cors = require("cors");
app.use(cors());

app.use("/transactions", transactionsRouter);

app.use("/auth", userAuthRouter);

app.use("/profile", userProfileRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Пупупу что-то не так с сервером" });
});

const server = http.createServer(app);
initSockets(server);
server.listen(PORT, () => console.log(`Server on ${PORT}`));
