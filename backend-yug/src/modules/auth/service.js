const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const logger = require('../../utils/logger');

const SALT_ROUNDS = 12;

/* ──────────────────────────── helpers ──────────────────────────── */

const stripPassword = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

const signAccessToken = (user) =>
  jwt.sign(
    { id: user.id, login_id: user.login_id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

/* ──────────────────────────── signup ──────────────────────────── */

const signup = async ({ login_id, email, password, role }) => {
  const existingLoginId = await db('users').where({ login_id }).first();
  if (existingLoginId) {
    const err = new Error('This login ID is already taken');
    err.statusCode = 409;
    throw err;
  }

  const existingEmail = await db('users').where({ email }).first();
  if (existingEmail) {
    const err = new Error('This email is already registered');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db('users')
    .insert({ login_id, email, password_hash, role: role || 'staff' })
    .returning('*');

  logger.info(`New user registered: ${login_id}`);
  return stripPassword(user);
};

/* ──────────────────────────── login ──────────────────────────── */

const login = async ({ login_id, password }) => {
  const user = await db('users').where({ login_id }).first();
  if (!user) {
    const err = new Error('Invalid Login ID or Password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated. Contact your manager.');
    err.statusCode = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid Login ID or Password');
    err.statusCode = 401;
    throw err;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await db('users').where({ id: user.id }).update({ refresh_token_hash: refreshTokenHash });

  logger.info(`User logged in: ${login_id}`);
  return { accessToken, refreshToken, user: stripPassword(user) };
};

/* ──────────────────────── forgot password ─────────────────────── */

const forgotPassword = async (email) => {
  const user = await db('users').where({ email }).first();
  if (!user) {
    const err = new Error('No account with this email');
    err.statusCode = 404;
    throw err;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db('users').where({ id: user.id }).update({
    otp_code: otpHash,
    otp_expires: otpExpires,
  });

  logger.info(`OTP generated for: ${email}`);
  return otp; // in production, email this instead of returning it
};

/* ─────────────────────────── verify otp ───────────────────────── */

const verifyOtp = async (email, otp) => {
  const user = await db('users').where({ email }).first();
  if (!user) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }

  if (!user.otp_code || !user.otp_expires || new Date() > new Date(user.otp_expires)) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }

  const valid = await bcrypt.compare(otp, user.otp_code);
  if (!valid) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }

  return true;
};

/* ────────────────────────── reset password ─────────────────────── */

const resetPassword = async (email, otp, newPassword) => {
  await verifyOtp(email, otp);

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db('users').where({ email }).update({
    password_hash,
    otp_code: null,
    otp_expires: null,
    refresh_token_hash: null,
  });

  logger.info(`Password reset for: ${email}`);
};

/* ────────────────────────── refresh token ──────────────────────── */

const refreshToken = async (token) => {
  if (!token) {
    const err = new Error('Refresh token required');
    err.statusCode = 401;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (jwtErr) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await db('users').where({ id: payload.id }).first();
  if (!user || !user.refresh_token_hash) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(token, user.refresh_token_hash);
  if (!valid) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const accessToken = signAccessToken(user);
  logger.info(`Token refreshed for user: ${user.login_id}`);
  return accessToken;
};

/* ──────────────────────────── logout ───────────────────────────── */

const logout = async (userId) => {
  await db('users').where({ id: userId }).update({ refresh_token_hash: null });
  logger.info(`User logged out: ${userId}`);
};

module.exports = {
  signup,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  refreshToken,
  logout,
};
