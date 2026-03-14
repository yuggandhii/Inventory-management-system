import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: false,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export function generateOtpCode(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function sendOtpEmail(email, code, purpose = 'password reset') {
  if (transporter && config.smtp.from) {
    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `IMS - ${purpose === 'password_reset' ? 'Password Reset' : 'Verification'} Code`,
      text: `Your code is: ${code}. It expires in ${config.otp.expireMinutes} minutes.`,
      html: `<p>Your code is: <strong>${code}</strong></p><p>It expires in ${config.otp.expireMinutes} minutes.</p>`,
    });
    return;
  }
  console.log(`[OTP] ${purpose} for ${email}: ${code} (expires in ${config.otp.expireMinutes} min)`);
}
