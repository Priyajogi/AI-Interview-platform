// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode'; // CORRECT import
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      login({ 
        name: formData.email.split('@')[0], 
        email: formData.email 
      });
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle actual Google OAuth success
  const handleGoogleSuccess = (credentialResponse) => {
    setIsLoading(true);
    try {
      // CORRECT: Use jwtDecode (not jwt_decode)
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Create user object from Google data
      const googleUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        photo: decoded.picture,
        provider: 'google',
        joined: new Date().toISOString()
      };
      
      // Call your googleLogin function
      googleLogin(googleUser);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google login errors
  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="logo-section">
            <div className="logo" onClick={() => navigate('/')}>
              <span className="logo-icon">🤖</span>
              <h1>AI Interview Coach</h1>
            </div>
            <p className="tagline">Master interviews with AI-powered feedback</p>
          </div>
          
          <div className="login-stats">
            <div className="stat">
              <div className="stat-number">5,000+</div>
              <div className="stat-label">Users Practiced</div>
            </div>
            <div className="stat">
              <div className="stat-number">98%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat">
              <div className="stat-number">4.9★</div>
              <div className="stat-label">Rating</div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in to continue your interview practice</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  disabled={isLoading}
                  required
                />
                <div className="password-options">
                  <label className="remember-checkbox">
                    <input type="checkbox" />
                    <span className="checkmark"></span>
                    <span className="label-text">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="forgot-link">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-login"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="divider">
              <span>Or</span>
            </div>

            <div className="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
                locale="en_US"
                useOneTap={false}
              />
            </div>

            <div className="signup-section">
              <p>
                New to AI Interview Coach?{' '}
                <Link to="/signup" className="signup-link">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;