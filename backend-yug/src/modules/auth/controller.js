const authService = require('./service');
const { ok, created } = require('../../utils/response');

/* ──────────────────────────── signup ───────────────────────────── */

const signup = async (req, res, next) => {
  try {
    const user = await authService.signup(req.body);
    return created(res, user);
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────── login ────────────────────────────── */

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ok(res, { accessToken, user });
  } catch (err) {
    next(err);
  }
};

/* ──────────────────────────── logout ───────────────────────────── */

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.clearCookie('refreshToken');
    return ok(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

/* ────────────────────── forgot password ───────────────────────── */

const forgotPassword = async (req, res, next) => {
  try {
    const otp = await authService.forgotPassword(req.body.email);
    return ok(res, { message: 'OTP sent', otp });
  } catch (err) {
    next(err);
  }
};

/* ────────────────────────── verify otp ────────────────────────── */

const verifyOtp = async (req, res, next) => {
  try {
    await authService.verifyOtp(req.body.email, req.body.otp);
    return ok(res, { message: 'OTP verified' });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────────── reset password ─────────────────────── */

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
    return ok(res, { message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

/* ────────────────────────── refresh ────────────────────────────── */

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    const accessToken = await authService.refreshToken(token);
    return ok(res, { accessToken });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  refresh,
};
