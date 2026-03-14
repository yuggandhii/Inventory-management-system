import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/index.js';
import { generateOtpCode, sendOtpEmail } from '../../utils/otp.js';

const SALT_ROUNDS = 10;

export async function signup(req, res, next) {
  try {
    const { email, password, name, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: name || null,
        role: role || 'staff',
      },
      select: { id: true, email: true, name: true, role: true },
    });
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ message: 'If the email exists, you will receive an OTP' });
    }
    const code = generateOtpCode(6);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expireMinutes);

    await prisma.otp.create({
      data: {
        email,
        code,
        type: 'password_reset',
        expiresAt,
        userId: user.id,
      },
    });
    await sendOtpEmail(email, code, 'password_reset');
    res.json({ message: 'If the email exists, you will receive an OTP' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordWithOtp(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    const otp = await prisma.otp.findFirst({
      where: {
        email,
        code,
        type: 'password_reset',
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || new Date() > otp.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: otp.userId },
        data: { password: hash },
      }),
      prisma.otp.update({
        where: { id: otp.id },
        data: { used: true },
      }),
    ]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}
