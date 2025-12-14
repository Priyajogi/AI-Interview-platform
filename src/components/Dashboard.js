// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    questionsAttempted: 0,
    improvement: 0,
    streak: 0
  });

  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [skillData, setSkillData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - replace with actual API call later
      const mockStats = {
        totalInterviews: 8,
        averageScore: 78,
        bestScore: 94,
        questionsAttempted: 42,
        improvement: 12,
        streak: 5
      };

      const mockInterviews = [
        { id: 1, date: '2024-01-15', score: 85, type: 'Technical', duration: '12:30' },
        { id: 2, date: '2024-01-14', score: 92, type: 'Behavioral', duration: '15:45' },
        { id: 3, date: '2024-01-12', score: 76, type: 'HR', duration: '10:20' },
        { id: 4, date: '2024-01-10', score: 88, type: 'Technical', duration: '18:10' },
        { id: 5, date: '2024-01-08', score: 81, type: 'Behavioral', duration: '14:25' }
      ];

      // Mock chart data
      const mockPerformance = [
        { name: 'Jan 1', score: 65 },
        { name: 'Jan 8', score: 72 },
        { name: 'Jan 15', score: 78 },
        { name: 'Jan 22', score: 85 },
        { name: 'Jan 29', score: 88 }
      ];

      const mockSkills = [
        { name: 'Content', value: 82 },
        { name: 'Communication', value: 78 },
        { name: 'Confidence', value: 85 },
        { name: 'Technical', value: 75 }
      ];

      const mockCategories = [
        { name: 'Technical', value: 45, color: '#0088FE' },
        { name: 'Behavioral', value: 35, color: '#00C49F' },
        { name: 'HR', value: 20, color: '#FFBB28' }
      ];

      setStats(mockStats);
      setRecentInterviews(mockInterviews);
      setPerformanceData(mockPerformance);
      setSkillData(mockSkills);
      setCategoryData(mockCategories);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const startInterview = () => {
    navigate('/interview');
  };

  const viewInterviewDetails = (id) => {
    // Navigate to interview details page
    console.log('View interview:', id);
    // navigate(`/interview/${id}`);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const StatCard = ({ icon, title, value, subtitle, color }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p className="stat-title">{title}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Interview Performance Dashboard</h1>
          <p className="subtitle">Track your progress and improve with AI-powered feedback</p>
          <div className="user-badges">
            <span className="badge streak">🔥 {stats.streak} Day Streak</span>
            <span className="badge level">Level: Intermediate</span>
          </div>
        </div>
        <button className="btn-primary start-interview-btn" onClick={startInterview}>
          🎤 Start New Interview
        </button>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <StatCard 
          icon="🎤" 
          title="Total Interviews" 
          value={stats.totalInterviews}
          subtitle="+2 this week"
          color="#667eea"
        />
        <StatCard 
          icon="📈" 
          title="Average Score" 
          value={`${stats.averageScore}%`}
          subtitle={`↑ ${stats.improvement}% improvement`}
          color="#38a169"
        />
        <StatCard 
          icon="🏆" 
          title="Best Score" 
          value={`${stats.bestScore}%`}
          subtitle="Your personal record"
          color="#f6ad55"
        />
        <StatCard 
          icon="❓" 
          title="Questions Attempted" 
          value={stats.questionsAttempted}
          subtitle="Across all categories"
          color="#4299e1"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Performance Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#718096" />
                <YAxis stroke="#718096" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#667eea" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>🎯 Skill Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={skillData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Interviews & Category Distribution */}
      <div className="bottom-section">
        <div className="recent-interviews-card">
          <div className="section-header">
            <h3>Recent Interviews</h3>
            <button className="view-all-btn">View All →</button>
          </div>
          
          <div className="interviews-table">
            <div className="table-header">
              <div>Date</div>
              <div>Type</div>
              <div>Duration</div>
              <div>Score</div>
              <div>Actions</div>
            </div>
            
            {recentInterviews.map(interview => (
              <div key={interview.id} className="table-row">
                <div className="date-cell">{interview.date}</div>
                <div>
                  <span className={`type-badge ${interview.type.toLowerCase()}`}>
                    {interview.type}
                  </span>
                </div>
                <div>{interview.duration}</div>
                <div>
                  <div className="score-container">
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${interview.score}%` }}
                      ></div>
                    </div>
                    <span className="score-text">{interview.score}%</span>
                  </div>
                </div>
                <div className="action-cells">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => viewInterviewDetails(interview.id)}
                  >
                    View
                  </button>
                  <button className="action-btn report-btn">Report</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="category-card">
          <h3>📊 Question Categories</h3>
          <div className="category-distribution">
            {categoryData.map((category, index) => (
              <div key={index} className="category-item">
                <div className="category-info">
                  <span 
                    className="category-color" 
                    style={{ backgroundColor: category.color }}
                  ></span>
                  <span className="category-name">{category.name}</span>
                </div>
                <div className="category-stats">
                  <span className="category-percent">{category.value}%</span>
                  <div className="category-bar">
                    <div 
                      className="category-fill"
                      style={{ 
                        width: `${category.value}%`,
                        backgroundColor: category.color
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="category-total">
            <span>Total Questions: {stats.questionsAttempted}</span>
          </div>
        </div>
      </div>

      {/* Bar Chart - Category Performance */}
      <div className="bar-chart-card">
        <h3>📊 Performance by Category</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#718096" />
              <YAxis stroke="#718096" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="value" 
                name="Score %" 
                radius={[4, 4, 0, 0]}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>⚡ Quick Actions</h3>
        <div className="action-buttons">
          <button className="btn-primary" onClick={startInterview}>
            <span className="btn-icon">🎤</span>
            Practice Interview
          </button>
          <button className="btn-secondary">
            <span className="btn-icon">📊</span>
            View Analytics
          </button>
          <button className="btn-secondary">
            <span className="btn-icon">📄</span>
            Generate Report
          </button>
          <button className="btn-secondary">
            <span className="btn-icon">🎯</span>
            Weak Area Practice
          </button>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="tips-section">
        <h3>💡 Tips for Improvement</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <div className="tip-content">
              <h4>Focus on Technical Questions</h4>
              <p>Your technical score (75%) is lower than other areas. Practice more coding questions.</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">⏱️</div>
            <div className="tip-content">
              <h4>Improve Answer Length</h4>
              <p>Aim for 60-90 second answers with specific examples and quantifiable results.</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">📈</div>
            <div className="tip-content">
              <h4>Consistent Practice</h4>
              <p>Maintain your {stats.streak}-day streak! Daily practice leads to 40% better results.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;