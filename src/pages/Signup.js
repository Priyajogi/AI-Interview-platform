// src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      login();
      navigate('/dashboard');
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsLoading(true);
    setTimeout(() => {
      login();
      navigate('/dashboard');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left">
          <div className="logo-section">
            <div className="logo" onClick={() => navigate('/')}>
              <span className="logo-icon">🤖</span>
              <h1>AI Interview Coach</h1>
            </div>
            <p className="tagline">Start mastering interviews today</p>
          </div>
          
          <div className="signup-benefits">
            <h3>Start your free account</h3>
            <div className="benefits-list">
              <div className="benefit">
                <span>✅</span>
                <div>
                  <strong>Unlimited Practice</strong>
                  <p>Access all interview scenarios</p>
                </div>
              </div>
              <div className="benefit">
                <span>✅</span>
                <div>
                  <strong>AI Feedback</strong>
                  <p>Get instant, detailed feedback</p>
                </div>
              </div>
              <div className="benefit">
                <span>✅</span>
                <div>
                  <strong>Progress Tracking</strong>
                  <p>Monitor your improvement</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="signup-right">
          <div className="signup-card">
            <div className="signup-header">
              <h2>Create Account</h2>
              <p>Start your 7-day free trial</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  placeholder="Create a password (min. 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="terms-agreement">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn-signup"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Start Free Trial'}
              </button>
            </form>

            <div className="divider">
              <span>Or sign up with</span>
            </div>

            <button 
              className="btn-google"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              <span className="google-icon">G</span>
              Sign up with Google
            </button>

            <div className="login-section">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="login-link">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;