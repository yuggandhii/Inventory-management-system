const { z } = require('zod');

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const signupSchema = z.object({
  login_id: z
    .string()
    .min(6, 'Login ID must be at least 6 characters')
    .max(12, 'Login ID must be at most 12 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Login ID can only contain letters, digits, and underscores'),
  email: z.string().email('Invalid email format'),
  password: passwordRule,
  role: z.enum(['manager', 'staff']).default('staff'),
});

const loginSchema = z.object({
  login_id: z.string().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
};
