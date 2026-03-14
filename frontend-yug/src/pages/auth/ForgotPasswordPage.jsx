import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const pwRules = [
  { label: 'Uppercase letter', test: /[A-Z]/ },
  { label: 'Lowercase letter', test: /[a-z]/ },
  { label: 'Digit', test: /[0-9]/ },
  { label: 'Special character', test: /[^A-Za-z0-9]/ },
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!z.string().email().safeParse(email).success) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(`OTP: ${data.data.otp}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);
    if (value && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const otpStr = otp.join('');
    if (otpStr.length !== 6) { setError('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: otpStr });
      toast.success('OTP verified!');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Min 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: otp.join(''),
        newPassword,
        confirmPassword,
      });
      toast.success('Password reset! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">📦 CoreInventory</div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={`stepper-step${step === s ? ' active' : ''}${step > s ? ' completed' : ''}`}>
                  {step > s ? '✓' : s}
                </div>
                <div className="stepper-label">{['Email', 'Verify', 'Reset'][i]}</div>
              </div>
              {i < 2 && <div className="stepper-line" />}
            </div>
          ))}
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input className="input" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Sending...' : 'Send OTP →'}</button>
          </form>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <label className="input-label">Enter 6-digit OTP</label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    className="input"
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    maxLength={1}
                    style={{ width: 48, height: 48, textAlign: 'center', fontSize: 20, fontWeight: 800, padding: 0 }}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP →'}</button>
          </form>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <form className="auth-form" onSubmit={handleReset}>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input type="password" className="input" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
                {pwRules.map((rule) => {
                  const met = rule.test.test(newPassword);
                  return (
                    <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: met ? 'var(--color-secondary)' : 'var(--color-text-secondary)' }}>
                      <span style={{ fontWeight: 700 }}>{met ? '✓' : '○'}</span> {rule.label}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input type="password" className="input" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword && confirmPassword !== newPassword && <span className="input-hint input-hint-error">Passwords do not match</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password →'}</button>
          </form>
        )}

        <div className="auth-links" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
