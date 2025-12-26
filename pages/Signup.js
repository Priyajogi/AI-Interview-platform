import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '', // Added username field
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: 'Enter a password',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });

  // Password validation function
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    let message = '';
    
    if (score === 0) message = 'Enter a password';
    else if (score === 1) message = 'Very Weak';
    else if (score === 2) message = 'Weak';
    else if (score === 3) message = 'Fair';
    else if (score === 4) message = 'Good';
    else message = 'Strong';

    return { score, message, requirements };
  };

  // Simple username validation
  const validateUsername = (username) => {
    if (!username) return { valid: false, message: 'Username is required' };
    
    if (username.length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 20) {
      return { valid: false, message: 'Username must be less than 20 characters' };
    }
    
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return { 
        valid: false, 
        message: 'Only letters, numbers, dots, hyphens and underscores allowed' 
      };
    }
    
    return { valid: true, message: '' };
  };

  // Update password strength when password changes
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(validatePassword(formData.password));
    } else {
      setPasswordStrength({
        score: 0,
        message: 'Enter a password',
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false
        }
      });
    }
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    // Username validation
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.valid) {
      setError(usernameValidation.message);
      return;
    }

    // Password validation
    const isValidPassword = Object.values(passwordStrength.requirements).every(req => req);
    if (!isValidPassword) {
      setError('Password does not meet all requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Email validation
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        setSuccess('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    const result = await googleLogin(decoded);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleError = () => {
    setError('Google signup failed. Please try again.');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getStrengthColor = (score) => {
    if (score <= 1) return '#ff4444';
    if (score === 2) return '#ffbb33';
    if (score === 3) return '#00C851';
    if (score >= 4) return '#007E33';
    return '#e0e0e0';
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
            <h3>Create Your Account</h3>
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
              <p>Join AI Interview Coach to improve your interview skills</p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="form-group">
                <label className="form-label-left">Full Name *</label>
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
                <label className="form-label-left">Username *</label>
                <input
                  type="text"
                  placeholder="Choose a unique username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value.trim()})}
                  disabled={isLoading}
                  required
                />
                <small className="form-hint">
                  3-20 characters. Letters, numbers, dots, hyphens and underscores only.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label-left">Email Address *</label>
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
                <label className="form-label-left">Password *</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg 
                        className="eye-icon" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8s-1.5 3-4.55 5.18M2 2l20 20M8.7 8.7A4 4 0 0112 8c2.21 0 4 1.79 4 4a4 4 0 01-.7 2.27M15 19.5l-2.62-2.62"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8s-1.5 3-4.55 5.18"/>
                      </svg>
                    ) : (
                      <svg 
                        className="eye-icon" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <div className="password-strength-indicator">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${passwordStrength.score * 20}%`,
                        backgroundColor: getStrengthColor(passwordStrength.score)
                      }}
                    ></div>
                  </div>
                  <div className="strength-text">
                    Strength: <span style={{ color: getStrengthColor(passwordStrength.score) }}>
                      {passwordStrength.message}
                    </span>
                  </div>
                </div>
                
                {/* Password Requirements List */}
                <div className="password-requirements">
                  <p className="requirements-title">Password must contain:</p>
                  <ul>
                    <li className={passwordStrength.requirements.length ? 'valid' : ''}>
                      {passwordStrength.requirements.length ? '✅' : '❌'} At least 8 characters
                    </li>
                    <li className={passwordStrength.requirements.uppercase ? 'valid' : ''}>
                      {passwordStrength.requirements.uppercase ? '✅' : '❌'} One uppercase letter (A-Z)
                    </li>
                    <li className={passwordStrength.requirements.lowercase ? 'valid' : ''}>
                      {passwordStrength.requirements.lowercase ? '✅' : '❌'} One lowercase letter (a-z)
                    </li>
                    <li className={passwordStrength.requirements.number ? 'valid' : ''}>
                      {passwordStrength.requirements.number ? '✅' : '❌'} One number (0-9)
                    </li>
                    <li className={passwordStrength.requirements.special ? 'valid' : ''}>
                      {passwordStrength.requirements.special ? '✅' : '❌'} One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label-left">Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  disabled={isLoading}
                  required
                />
                {formData.confirmPassword && (
                  <div className={`password-match ${formData.password === formData.confirmPassword ? 'valid' : 'invalid'}`}>
                    {formData.password === formData.confirmPassword ? (
                      '✅ Passwords match'
                    ) : (
                      '❌ Passwords do not match'
                    )}
                  </div>
                )}
              </div>

              <div className="terms-agreement">
                <input 
                  type="checkbox" 
                  id="terms" 
                  required 
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="form-label-left">
                  I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn-signup"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="divider">
              <span>Or sign up with</span>
            </div>

            <div className="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signup_with"
                shape="rectangular"
                width="100%"
                locale="en_US"
                useOneTap={false}
              />
            </div>

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