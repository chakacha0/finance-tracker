const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../models");
const validatePassword = require("../utils/validatePassword");
const { generateTokens, hashToken } = require("../utils/tokens");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email и password обязательны" });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: "Пароль не соответствует требованиям",
        details: passwordErrors,
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Пользователь с таким email уже существует" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ email, passwordHash });

    return res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email и password обязательны" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken обязателен" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "Недействительный refresh-токен" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || user.refreshToken !== hashToken(refreshToken)) {
      return res.status(401).json({ error: "Недействительный refresh-токен" });
    }

    // Выдаём новую пару, старый refresh перестаёт работать
    const tokens = generateTokens(user);
    user.refreshToken = hashToken(tokens.refreshToken);
    await user.save();

    return res.json(tokens);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  await User.update({ refreshToken: null }, { where: { id: req.user.id } });
  return res.json({ message: "Выход выполнен" });
});

module.exports = router;
