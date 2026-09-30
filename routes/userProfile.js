const express = require("express");
const { User } = require("../models");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "createdAt"], // без passwordHash
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.delete("/", async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.user.id } });

    if (!deleted) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    return res.json({ message: "Пользователь удалён" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;
