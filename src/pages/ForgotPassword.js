// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call to send reset email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, you would:
      // 1. Send reset email to user's email
      // 2. Generate reset token
      // 3. Store token in database
      // 4. Send email with reset link
      
      setIsSubmitted(true);
      console.log('Reset email sent to:', email);
      
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">🤖</span>
            <h2>AI Interview Coach</h2>
          </div>
          
          <div className="forgot-password-content">
            {!isSubmitted ? (
              <>
                <div className="forgot-password-header">
                  <h1>Forgot Password?</h1>
                  <p>Enter your email address and we'll send you a link to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit} className="forgot-password-form">
                  {error && <div className="error-message">{error}</div>}
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-reset"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="back-to-login">
                  <Link to="/login" className="back-link">
                    ← Back to Login
                  </Link>
                </div>
              </>
            ) : (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <h2>Check Your Email</h2>
                <p>
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Please check your inbox and follow the instructions.
                </p>
                <div className="success-tips">
                  <p>💡 <strong>Tips:</strong></p>
                  <ul>
                    <li>Check your spam folder if you don't see the email</li>
                    <li>The link expires in 1 hour for security</li>
                    <li>Contact support if you need help</li>
                  </ul>
                </div>
                <div className="success-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/login')}
                  >
                    Return to Login
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                  >
                    Send to a different email
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="forgot-password-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="login-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
        
        <div className="forgot-password-info">
          <h3>Password Reset Security</h3>
          <div className="security-tips">
            <div className="tip">
              <span>🔒</span>
              <div>
                <strong>Secure Process</strong>
                <p>Reset links expire after 1 hour</p>
              </div>
            </div>
            <div className="tip">
              <span>📧</span>
              <div>
                <strong>Email Verification</strong>
                <p>Only sent to registered emails</p>
              </div>
            </div>
            <div className="tip">
              <span>⚡</span>
              <div>
                <strong>Quick & Easy</strong>
                <p>Reset in just a few clicks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;