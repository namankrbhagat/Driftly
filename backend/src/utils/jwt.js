const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }; // Default to 7 days if not set
  return jwt.sign(payload, secret, options);
}

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}

module.exports = { generateToken, verifyToken };