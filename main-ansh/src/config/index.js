import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  otp: {
    expireMinutes: parseInt(process.env.OTP_EXPIRE_MINUTES || '10', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'noreply@ims.local',
  },
};
