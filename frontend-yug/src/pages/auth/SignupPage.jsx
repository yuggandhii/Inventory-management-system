import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const schema = z.object({
  login_id: z.string()
    .min(6, 'Must be at least 6 characters')
    .max(12, 'Must be at most 12 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, digits, and underscores only'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const pwRules = [
  { label: 'Uppercase letter', test: /[A-Z]/ },
  { label: 'Lowercase letter', test: /[a-z]/ },
  { label: 'Digit', test: /[0-9]/ },
  { label: 'Special character', test: /[^A-Za-z0-9]/ },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting, touchedFields } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirmPassword', '');

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post('/auth/signup', {
        login_id: values.login_id,
        email: values.email,
        password: values.password,
      });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">📦 CoreInventory</div>
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          {serverError && <div className="auth-error">{serverError}</div>}

          <div className="input-group">
            <label className="input-label">Login ID</label>
            <input className={`input${errors.login_id ? ' input-error' : ''}`} placeholder="Choose a login ID" {...register('login_id')} />
            <span className={`input-hint ${errors.login_id ? 'input-hint-error' : touchedFields.login_id && !errors.login_id ? 'input-hint-success' : ''}`}>
              {errors.login_id?.message || '6–12 characters, letters/digits/underscores only'}
            </span>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <input className={`input${errors.email ? ' input-error' : ''}`} placeholder="your@email.com" {...register('email')} />
            {errors.email && <span className="input-hint input-hint-error">{errors.email.message}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className={`input${errors.password ? ' input-error' : ''}`} placeholder="Create a password" {...register('password')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
              {pwRules.map((rule) => {
                const met = rule.test.test(password);
                return (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: met ? 'var(--color-secondary)' : 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: 700 }}>{met ? '✓' : '○'}</span> {rule.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Re-enter Password</label>
            <input type="password" className={`input${errors.confirmPassword ? ' input-error' : ''}`} placeholder="Confirm your password" {...register('confirmPassword')} />
            {touchedFields.confirmPassword && confirmPassword && confirmPassword !== password && (
              <span className="input-hint input-hint-error">Passwords do not match</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up →'}
          </button>

          <div className="auth-links" style={{ justifyContent: 'center' }}>
            <Link to="/login">Already have an account? Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
