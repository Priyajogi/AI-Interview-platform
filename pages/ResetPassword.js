// src/pages/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import './ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const API_URL = 'http://localhost:5000/api';

  // Get token from URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    } else {
      setError('Invalid or missing reset token.');
      setIsVerifying(false);
    }
  }, [searchParams]);

  // Verify token with backend
  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_URL}/verify-reset-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Invalid reset token');

      setEmail(data.email);
      setError('');
      
      // Start countdown (1 hour token)
      const tokenExp = Date.now() + 60 * 60 * 1000; // 1 hour
      setCountdown(tokenExp);
    } catch (err) {
      setError(err.message || 'Invalid or expired reset link.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => {
      const remaining = countdown - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        setToken('');
        setError('Reset link has expired. Please request a new one.');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    const { password, confirmPassword } = formData;
    if (!password || !confirmPassword) {
      setError('Please fill in all fields'); return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter'); return; }
    if (!/[a-z]/.test(password)) { setError('Password must contain at least one lowercase letter'); return; }
    if (!/\d/.test(password)) { setError('Password must contain at least one number'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { setError('Password must contain at least one special character (!@#$%^&*)'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (!token) { setError('Invalid reset link. Please request a new one.'); return; }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');

      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: 'Enter a password' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    const texts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return { score: Math.min(score, 5), text: texts[Math.min(score, 5)] };
  };
  const passwordStrength = getPasswordStrength(formData.password);

  if (isVerifying) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="logo" onClick={() => navigate('/')}>
              <span className="logo-icon">🤖</span>
              <h2>AI Interview Coach</h2>
            </div>
            <div className="verifying-message">
              <div className="spinner"></div>
              <h3>Verifying reset link...</h3>
              <p>Please wait while we validate your reset request</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">🤖</span>
            <h2>AI Interview Coach</h2>
          </div>

          <div className="reset-password-content">
            {!isSuccess ? (
              <>
                <div className="reset-password-header">
                  <h1>Reset Your Password</h1>
                  <p>Create a new strong password for your account</p>
                  {email && <p className="reset-email">Account: <strong>{email}</strong></p>}
                  {countdown && (
                    <p className="countdown">
                      Link expires in: {Math.floor((countdown - Date.now()) / 60000)} min
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="reset-password-form">
                  {error && <div className="error-message">{error}</div>}

                  <div className="form-group">
                    <label htmlFor="password">New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Enter new password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      disabled={isLoading}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>

                    {formData.password && (
                      <div className="password-strength">
                        <div className="strength-bar">
                          <div
                            className={`strength-fill strength-${passwordStrength.score}`}
                            style={{ width: `${passwordStrength.score * 20}%` }}
                          ></div>
                        </div>
                        <div className="strength-text">
                          Strength: <span className={`strength-${passwordStrength.score}`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="password-requirements">
                      <p className="requirements-title">Password Requirements:</p>
                      <ul>
                        <li className={formData.password.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
                        <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>One uppercase letter</li>
                        <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>One lowercase letter</li>
                        <li className={/\d/.test(formData.password) ? 'valid' : ''}>One number</li>
                        <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'valid' : ''}>One special character</li>
                      </ul>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="Re-enter your new password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      disabled={isLoading}
                      required
                      autoComplete="new-password"
                    />
                    {formData.confirmPassword && (
                      <div className={`password-match ${formData.password === formData.confirmPassword ? 'valid' : 'invalid'}`}>
                        {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn-reset" disabled={isLoading || !token}>
                    {isLoading ? <> <span className="spinner"></span> Resetting Password... </> : 'Reset Password'}
                  </button>

                  {!token && (
                    <div className="invalid-token-message">
                      <p>This reset link is invalid or has expired.</p>
                      <Link to="/forgot-password" className="request-new-link">Request a new reset link</Link>
                    </div>
                  )}
                </form>

                <div className="reset-footer">
                  <Link to="/login" className="back-link">← Back to Login</Link>
                </div>
              </>
            ) : (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <h2>Password Reset Successful!</h2>
                <p>Your password has been successfully updated. Redirecting to login...</p>
                <div className="success-actions">
                  <button className="btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
                  <button className="btn-secondary" onClick={() => navigate('/')}>Go to Home</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
