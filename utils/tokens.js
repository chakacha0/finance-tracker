const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateTokens(user) {
  const payload = { id: user.id, email: user.email };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
    jwtid: crypto.randomUUID(),
  });

  return { accessToken, refreshToken };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = { generateTokens, hashToken };
