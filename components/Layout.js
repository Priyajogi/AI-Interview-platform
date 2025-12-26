import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  
  const isLandingPage = location.pathname === '/';
  
  // Pages where navigation should be HIDDEN:
  // 1. Auth pages (login, signup, password pages)
  // 2. Dashboard page
  // 3. Interview pages (any page starting with /interview)
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isDashboardPage = location.pathname === '/dashboard';
  const isInterviewPage = location.pathname.startsWith('/interview');
  
  // Show navigation ONLY on Landing Page
  const showNavigation = isLandingPage && !isAuthPage && !isDashboardPage && !isInterviewPage;

  return (
    <div className="app-container">
      {/* Global Navigation Bar - ONLY on Landing Page */}
      {showNavigation && (
        <nav className="global-nav">
          <div className="nav-container">
            <div className="logo" onClick={() => navigate('/')}>
              <span className="logo-icon">🤖</span>
              <h1>AI Interview Coach</h1>
            </div>
            
            <div className="nav-right">
              {/* Dark Mode Toggle - Only on Landing Page */}
              <button 
                className="dark-mode-toggle"
                onClick={toggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <>
                    <span className="theme-icon">🌞</span>
                    <span className="theme-label">Light</span>
                  </>
                ) : (
                  <>
                    <span className="theme-icon">🌙</span>
                    <span className="theme-label">Dark</span>
                  </>
                )}
              </button>

              {/* Navigation Links */}
              <div className="nav-links">
                <a href="#features">Features</a>
                <a href="#how-it-works">How it Works</a>
                <a href="#testimonials">Testimonials</a>
              </div>

              {/* Auth Buttons */}
              <div className="auth-buttons">
                <button className="btn-secondary" onClick={() => navigate('/login')}>
                  Sign In
                </button>
                <button className="btn-primary" onClick={() => navigate('/signup')}>
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`app-main ${!showNavigation ? 'no-nav' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;