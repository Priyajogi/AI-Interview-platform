// src/components/Dashboard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import axiosInstance from '../api/axiosConfig';
import './Dashboard.css';

// Memoized StatBox Component
const StatBox = React.memo(({ icon, value, label, index }) => {
  const colors = ['#667eea', '#4fd1c5', '#f6ad55', '#fc8181'];
  const bgColors = ['rgba(102, 126, 234, 0.1)', 'rgba(79, 209, 197, 0.1)', 'rgba(246, 173, 85, 0.1)', 'rgba(252, 129, 129, 0.1)'];
  
  return (
    <div className="stat-box" style={{ borderTop: `4px solid ${colors[index]}` }}>
      <div className="stat-icon" style={{ background: bgColors[index], color: colors[index] }}>
        {icon}
      </div>
      <div className="stat-content">
        <h2>{value}</h2>
        <p>{label}</p>
      </div>
    </div>
  );
});

StatBox.displayName = 'StatBox';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    user: { name: '', streak: 0 },
    stats: { totalInterviews: 0, avgScore: 0, bestScore: 0, improvement: 0 },
    performanceData: [],
    pieData: [],
    categoryData: [],
    recentInterviews: [],
    tips: []
  });

  // Backend API base URL - update this to your backend URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Memoized default data functions
  const getDefaultPerformanceData = useCallback(() => [
    { name: 'W1', score: 65, color: '#667eea' },
    { name: 'W2', score: 72, color: '#4fd1c5' },
    { name: 'W3', score: 78, color: '#f6ad55' },
    { name: 'W4', score: 82, color: '#fc8181' },
    { name: 'W5', score: 85, color: '#9f7aea' },
    { name: 'W6', score: 82, color: '#667eea' }
  ], []);

  const getDefaultPieData = useCallback(() => [
    { name: 'Technical', value: 35, color: '#667eea' },
    { name: 'Behavioral', value: 30, color: '#4fd1c5' },
    { name: 'HR', value: 20, color: '#f6ad55' },
    { name: 'Scenario', value: 15, color: '#fc8181' }
  ], []);

  const getDefaultCategoryData = useCallback(() => [
    { name: 'Technical', score: 75, questions: 25, color: '#667eea' },
    { name: 'Behavioral', score: 82, questions: 18, color: '#4fd1c5' },
    { name: 'HR', score: 88, questions: 15, color: '#f6ad55' }
  ], []);

  const getDefaultTips = useCallback(() => [
    { id: 1, title: 'Technical Skills', description: 'Focus on system design questions.', icon: '🎯', color: '#667eea' },
    { id: 2, title: 'Communication', description: 'Practice speaking clearly and concisely.', icon: '💬', color: '#4fd1c5' },
    { id: 3, title: 'Time Management', description: 'Work on answering within 2-3 minutes.', icon: '⏱️', color: '#f6ad55' },
    { id: 4, title: 'Consistency', description: 'Maintain your streak!', icon: '📈', color: '#fc8181' }
  ], []);

  const getDefaultData = useCallback(() => ({
    user: { name: 'John', streak: 7 },
    stats: { totalInterviews: 12, avgScore: 82, bestScore: 96, improvement: 15 },
    performanceData: getDefaultPerformanceData(),
    pieData: getDefaultPieData(),
    categoryData: getDefaultCategoryData(),
    recentInterviews: [
      { id: 1, type: 'Technical', score: 85, date: 'Today', duration: '12:45' },
      { id: 2, type: 'Behavioral', score: 92, date: 'Yesterday', duration: '15:20' },
      { id: 3, type: 'HR', score: 78, date: 'Jan 20', duration: '08:30' }
    ],
    tips: getDefaultTips()
  }), [getDefaultPerformanceData, getDefaultPieData, getDefaultCategoryData, getDefaultTips]);

  // Fetch dashboard data from backend
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Make API call to backend - FIXED: Added proper API_BASE_URL
      const response = await axiosInstance.get(`${API_BASE_URL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        // Transform backend data to match frontend structure
        const backendData = response.data.data;
        
        setDashboardData({
          user: backendData.user || { name: 'User', streak: 0 },
          stats: backendData.stats || { totalInterviews: 0, avgScore: 0, bestScore: 0, improvement: 0 },
          performanceData: backendData.performanceData || getDefaultPerformanceData(),
          pieData: backendData.pieData || getDefaultPieData(),
          categoryData: backendData.categoryData || getDefaultCategoryData(),
          recentInterviews: backendData.recentInterviews || [],
          tips: backendData.tips || getDefaultTips()
        });
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Using sample data.');
      // Fallback to default data
      setDashboardData(getDefaultData());
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, getDefaultData, getDefaultPerformanceData, getDefaultPieData, getDefaultCategoryData, getDefaultTips]);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Optional: Set up polling for real-time updates
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  // Memoized quick actions data
  const quickActions = useMemo(() => [
    { id: 1, icon: '🎤', label: 'Practice Interview', color: '#667eea' },
    { id: 2, icon: '🎯', label: 'Weak Areas', color: '#4fd1c5' },
    { id: 3, icon: '📊', label: 'Analytics', color: '#f6ad55' },
    { id: 4, icon: '📄', label: 'Generate Report', color: '#fc8181' }
  ], []);

  // Navigation handlers
  const handleStartInterview = () => {
    navigate('/interview');
  };

  const handleViewInterview = useCallback((id) => {
    navigate(`/interview/${id}`);
  }, [navigate]);

  const handleViewAllInterviews = useCallback(() => {
    navigate('/interviews');
  }, [navigate]);

  const handleViewAnalytics = useCallback(() => {
    navigate('/analytics');
  }, [navigate]);

  const handleGenerateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.post(`${API_BASE_URL}/reports/generate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        // Navigate to report page or show download link
        window.open(response.data.reportUrl, '_blank');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Custom label for pie chart
  const renderCustomizedLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-loading" role="status" aria-live="polite">
        <div className="loading-spinner">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading your dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData.user.name) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, stats, performanceData, pieData, categoryData, recentInterviews, tips } = dashboardData;

  return (
    <div className="dashboard">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎯 Hey {user.name}! Ready to ace another interview?</h1>
          <p className="subtitle">Let's track your progress and level up your interview skills! 💪</p>
          <button onClick={handleRefresh} className="refresh-btn" aria-label="Refresh dashboard data">
            🔄 Refresh Data
          </button>
        </div>
        <div className="header-right">
          <div className="streak-badge" aria-label={`${user.streak} day streak`}>
            <span className="fire-icon">🔥</span>
            <span>🔥 {user.streak} Day Streak - Keep the fire burning!</span>
          </div>
          <button 
            className="primary-btn"
            onClick={handleStartInterview}
            aria-label="Start practice interview"
          >
            <span className="btn-icon">🚀</span>
            Start Practice Interview
          </button>
        </div>
      </header>

      {/* Top Stats Section */}
      <section className="stats-section" aria-label="Statistics overview">
        <StatBox 
          icon="📊"
          value={stats.totalInterviews}
          label="Total Interviews"
          index={0}
        />
        <StatBox 
          icon="📈"
          value={`${stats.avgScore}%`}
          label="Average Score"
          index={1}
        />
        <StatBox 
          icon="🏆"
          value={`${stats.bestScore}%`}
          label="Best Score"
          index={2}
        />
        <StatBox 
          icon="🔥"
          value={`+${stats.improvement}%`}
          label="Improvement"
          index={3}
        />
      </section>

      {/* Main Content Grid */}
      <main className="content-section">
        {/* Performance Chart Box */}
        <article className="content-box chart-box same-height">
          <div className="box-header">
            <h3>
              <span className="box-icon">📈</span>
              Performance Trend
            </h3>
            <button 
              className="view-btn"
              onClick={handleViewAnalytics}
              aria-label="View detailed analytics"
            >
              View Details →
            </button>
          </div>
          <div className="chart-container-same">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={performanceData} aria-label="Performance trend chart">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#718096" fontSize={11} />
                <YAxis stroke="#718096" fontSize={11} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: '#667eea', fontWeight: 'bold', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="score" 
                  name="Score (%)" 
                  radius={[6, 6, 0, 0]}
                  background={{ fill: '#f1f5f9' }}
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Recent Interviews Box */}
        <article className="content-box interviews-box same-height">
          <div className="box-header">
            <h3>
              <span className="box-icon">🕐</span>
              Recent Interviews
            </h3>
            <button 
              className="view-btn"
              onClick={handleViewAllInterviews}
              aria-label="View all interviews"
            >
              View All →
            </button>
          </div>
          <div className="interviews-container-same">
            {recentInterviews.map((interview) => (
              <div key={interview.id} className="interview-card-same">
                <div className="interview-header-same">
                  <div className="interview-type-same" style={{ 
                    background: pieData.find(p => p.name === interview.type)?.color + '20',
                    color: pieData.find(p => p.name === interview.type)?.color
                  }}>
                    {interview.type}
                  </div>
                  <div className="interview-date-same">{interview.date}</div>
                </div>
                <div className="interview-body-same">
                  <div className="score-display-same">
                    <div className="score-value-same">{interview.score}%</div>
                    <div className="score-bar-same">
                      <div 
                        className="score-fill-same"
                        style={{ 
                          width: `${interview.score}%`,
                          background: `linear-gradient(90deg, ${pieData.find(p => p.name === interview.type)?.color}, ${pieData.find(p => p.name === interview.type)?.color}80)`
                        }}
                      ></div>
                    </div>
                  </div>
                  <button 
                    className="view-details-btn-same"
                    onClick={() => handleViewInterview(interview.id)}
                    aria-label={`View details for ${interview.type} interview`}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Category Performance Box */}
        <article className="content-box category-box same-height">
          <div className="box-header">
            <h3>
              <span className="box-icon">🎯</span>
              Category Performance
            </h3>
          </div>
          <div className="categories-container-same">
            {categoryData.map((category, index) => (
              <div key={index} className="category-item-same">
                <div className="category-header-same">
                  <div className="category-name-same">
                    <span 
                      className="category-dot-same" 
                      style={{ background: category.color }}
                    ></span>
                    {category.name}
                  </div>
                  <div className="category-score-same">{category.score}%</div>
                </div>
                <div className="progress-container-same">
                  <div 
                    className="progress-fill-same"
                    style={{ 
                      width: `${category.score}%`,
                      background: `linear-gradient(90deg, ${category.color}, ${category.color}80)`
                    }}
                  ></div>
                </div>
                <div className="category-footer-same">
                  <span className="question-count-same">
                    📝 {category.questions} questions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Pie Chart Box */}
        <article className="content-box pie-box same-height">
          <div className="box-header">
            <h3>
              <span className="box-icon">📊</span>
              Score Distribution
            </h3>
          </div>
          <div className="pie-chart-container-same">
            <div className="pie-chart-wrapper-same">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{ 
                      background: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-legend-same">
              {pieData.map((item, index) => (
                <div key={index} className="legend-item-same">
                  <div className="legend-color-same" style={{ background: item.color }}></div>
                  <div className="legend-label-same">{item.name}</div>
                  <div className="legend-value-same">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </main>

      {/* Improvement Tips Section */}
      <section className="tips-section" aria-label="Improvement tips">
        <div className="section-header">
          <h2>
            <span className="section-icon">💡</span>
            Tips for Improvement
          </h2>
          <p className="section-subtitle">Personalized recommendations based on your performance</p>
        </div>
        <div className="tips-grid">
          {tips.map((tip) => (
            <div key={tip.id} className="tip-card" style={{ borderLeft: `4px solid ${tip.color}` }}>
              <div className="tip-icon" style={{ background: tip.color }}>
                {tip.icon}
              </div>
              <div className="tip-content">
                <h4>{tip.title}</h4>
                <p>{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="actions-section" aria-label="Quick actions">
        <div className="section-header">
          <h2>
            <span className="section-icon">⚡</span>
            Quick Actions
          </h2>
          <p className="section-subtitle">Take action to improve your skills</p>
        </div>
        <div className="actions-grid">
          {quickActions.map((action) => (
            <button 
              key={action.id}
              className="action-button"
              style={{ 
                background: action.color,
                boxShadow: `0 4px 15px ${action.color}40`
              }}
              onClick={action.id === 1 ? handleStartInterview : 
                      action.id === 4 ? handleGenerateReport : 
                      handleViewAnalytics}
              aria-label={`${action.label} action`}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;