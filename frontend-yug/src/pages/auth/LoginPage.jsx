import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const schema = z.object({
  login_id: z.string().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await api.post('/auth/login', values);
      setAuth(data.data.accessToken, data.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">📦 CoreInventory</div>
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          {serverError && <div className="auth-error">{serverError}</div>}

          <div className="input-group">
            <label className="input-label">Login ID</label>
            <input className={`input${errors.login_id ? ' input-error' : ''}`} placeholder="Enter your login ID" {...register('login_id')} />
            {errors.login_id && <span className="input-hint input-hint-error">{errors.login_id.message}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className={`input${errors.password ? ' input-error' : ''}`}
                placeholder="Enter your password"
                {...register('password')}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && <span className="input-hint input-hint-error">{errors.password.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In →'}
          </button>

          <div className="auth-links">
            <Link to="/forgot-password">Forgot Password?</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
