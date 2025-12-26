import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  // Function to handle getting started
  const handleGetStarted = () => {
    navigate('/signup');
  };

  // Function to handle demo video
  const handleWatchDemo = () => {
    navigate('/demo');
  };

  return (
    <div className="landing-page">
      {/* Hero Section - Navigation is now in Layout.js */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Ace Your Interviews with <span className="highlight">AI-Powered Practice</span></h1>
            <p className="hero-description">
              Get instant, personalized feedback on your interview answers. 
              Improve your communication, confidence, and technical skills today.
            </p>
            <div className="hero-buttons">
              <button 
                className="btn-primary btn-large" 
                onClick={handleGetStarted}
              >
                🚀 Start Practicing Now
              </button>
              <button 
                className="btn-secondary btn-large" 
                onClick={handleWatchDemo}
              >
                🎬 See Demo
              </button>
            </div>
            <div className="hero-highlights">
              <div className="highlight-item">
                <span className="checkmark">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="highlight-item">
                <span className="checkmark">✓</span>
                <span>Get started instantly</span>
              </div>
              <div className="highlight-item">
                <span className="checkmark">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">5,000+</div>
                <div className="stat-label">Users Practiced</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">98%</div>
                <div className="stat-label">Success Rate</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">4.9★</div>
                <div className="stat-label">User Rating</div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-title">AI Interview Dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span>Current Score</span>
                    <strong>85%</strong>
                  </div>
                  <div className="preview-stat">
                    <span>Improvement</span>
                    <strong className="positive">+12%</strong>
                  </div>
                </div>
                <div className="preview-features">
                  <div className="feature-item">
                    <span className="feature-icon">✅</span>
                    <span>AI-Powered Interviews</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">✅</span>
                    <span>Instant Feedback</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">✅</span>
                    <span>Progress Analytics</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">✅</span>
                    <span>PDF Reports</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">Why Choose AI Interview Coach?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎤</div>
            <h3>Realistic Practice</h3>
            <p>Practice with AI-powered interviews that mimic real scenarios</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Instant Feedback</h3>
            <p>Get detailed scores on content, communication, and confidence</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Track Progress</h3>
            <p>Monitor improvement with detailed analytics and charts</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📄</div>
            <h3>PDF Reports</h3>
            <p>Download professional reports to share with mentors</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Choose & Practice</h3>
            <p>Select from 100+ interview scenarios and record your answers with our AI interviewer.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Get AI Feedback</h3>
            <p>Receive instant analysis on your content, delivery, and communication skills.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Improve & Track</h3>
            <p>Follow personalized suggestions and track your progress with detailed analytics.</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
<footer className="landing-footer">
  <div className="footer-content">
    <div className="footer-logo">
      <span>🤖</span>
      <h3>AI Interview Coach</h3>
    </div>
    <div className="footer-bottom">
      <p>© 2025 AI Interview Coach. All rights reserved.</p>
    </div>
  </div>
</footer>
    </div>
  );
};

export default LandingPage;