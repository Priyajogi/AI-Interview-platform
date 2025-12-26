import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [error, setError] = useState('');

  // Load saved username/email when component mounts
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedIdentifier && savedRememberMe) {
      setFormData(prev => ({ ...prev, identifier: savedIdentifier }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.identifier || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // Pass only identifier and password (AuthContext might not accept rememberMe)
      const result = await login(formData.identifier, formData.password);
      
      if (result.success) {
        // Store the identifier if "Remember me" is checked
        if (rememberMe) {
          localStorage.setItem('rememberedIdentifier', formData.identifier);
          localStorage.setItem('rememberMe', 'true');
        } else {
          // Clear stored data if "Remember me" is unchecked
          localStorage.removeItem('rememberedIdentifier');
          localStorage.removeItem('rememberMe');
        }
        
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      const googleUser = {
        id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        photo: decoded.picture,
        provider: 'google',
        joined: new Date().toISOString()
      };
      
      googleLogin(googleUser);
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);
    
    // If user unchecks "Remember me", clear saved identifier immediately
    if (!isChecked) {
      localStorage.removeItem('rememberedIdentifier');
      localStorage.removeItem('rememberMe');
    }
  };

  // Clear saved identifier if user manually clears the input field
  const handleIdentifierChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, identifier: value }));
    
    // If user clears the field and "Remember me" is checked, update the stored value
    if (rememberMe) {
      if (value.trim() === '') {
        localStorage.removeItem('rememberedIdentifier');
      } else {
        localStorage.setItem('rememberedIdentifier', value);
      }
    }
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
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label className="form-label-left">Email or Username *</label>
                <input
                  type="text"
                  placeholder="Enter your email or username"
                  value={formData.identifier}
                  onChange={handleIdentifierChange}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label-left">Password *</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
                <div className="password-options">
                  <label className="remember-checkbox">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      disabled={isLoading}
                    />
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
              <span>Or continue with</span>
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
                Don't have an account?{' '}
                <Link to="/signup" className="signup-link">
                  Sign up now
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