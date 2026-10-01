const bcrypt = require("bcryptjs");
const {query} = require("../config/db");
const {generateToken} = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  created_at: user.created_at,
  updated_at: user.updated_at
});

const register = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const {password} = req.body;

  if(!name) throw ApiError.badRequest("Name is required");
  if(!EMAIL_RE.test(email)) throw ApiError.badRequest("Invalid email format");
  if(!password || password.length < 6) throw ApiError.badRequest("Password must be at least 6 characters long");

  const existingUser = await query("SELECT * FROM users WHERE email = $1", [email]);
  if(existingUser.rows.length > 0) throw ApiError.conflict("Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);
  const {rows} = await query(
    "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING *",
    [name, email, passwordHash]
  );
  const user = publicUser(rows[0]);
  const token = generateToken({id: user.id, email: user.email, name: user.name});
  res.status(201).json({user, token});
});

const login = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const {password} = req.body;  

  if(!email || !password) throw ApiError.badRequest("Email and password are required");
  const {rows} = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if(!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.password_hash);
  if(!valid) throw ApiError.unauthorized("Invalid email or password");

  const token = generateToken({id: user.id, email: user.email, name: user.name});
  res.json({user: publicUser(user), token});

});

const me = asyncHandler(async (req, res) => {
  const {rows} = await query("SELECT * FROM users WHERE id = $1", [req.user.id]);
  if(!rows.length) throw ApiError.notFound("User not found");
  res.json({user: publicUser(rows[0])});
});

module.exports = {register, login, me};