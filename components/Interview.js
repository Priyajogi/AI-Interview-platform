// src/components/Interview.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Interview.css';

const Interview = () => {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const subjects = [
    { 
      id: 'basic', 
      title: 'Basic Interview', 
      icon: '🎯', 
      color: '#4361ee',
      topics: ['Introduction', 'Simple Tech', 'HR Basics', 'Communication']
    },
    { 
      id: 'os', 
      title: 'Operating Systems', 
      icon: '💻', 
      color: '#06d6a0',
      topics: ['Process Management', 'Memory', 'Deadlocks', 'Scheduling']
    },
    { 
      id: 'cn', 
      title: 'Computer Networks', 
      icon: '🌐', 
      color: '#ff9e00',
      topics: ['TCP/IP', 'DNS', 'Security', 'Protocols']
    },
    { 
      id: 'dbms', 
      title: 'Database Systems', 
      icon: '🗄️', 
      color: '#ef476f',
      topics: ['SQL', 'Normalization', 'Transactions', 'Indexing']
    },
    { 
      id: 'dsa', 
      title: 'Data Structures', 
      icon: '📊', 
      color: '#9d4edd',
      topics: ['Arrays', 'Trees', 'Dynamic Programming', 'Sorting']
    },
    { 
      id: 'oop', 
      title: 'OOP Design', 
      icon: '🏗️', 
      color: '#38b000',
      topics: ['Design Patterns', 'SOLID', 'Architecture', 'UML']
    },
    { 
      id: 'behavioral', 
      title: 'Behavioral', 
      icon: '💬', 
      color: '#f72585',
      topics: ['Teamwork', 'Conflict', 'Goals', 'Leadership']
    },
    { 
      id: 'full', 
      title: 'Full Interview', 
      icon: '🚀', 
      color: '#3a0ca3',
      topics: ['All Technical', 'Behavioral', 'System Design']
    },
    { 
      id: 'resume', 
      title: 'Resume Based', 
      icon: '📄', 
      color: '#7209b7',
      topics: ['Projects', 'Skills', 'Experience', 'Achievements']
    },
  ];

  const handleResumeUpload = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const handleSubjectToggle = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  /*const handleStartInterview = () => {
    if (selectedSubjects.length === 0) {
      alert('Select at least one subject');
      return;
    }
    navigate(`/interview/start?subjects=${selectedSubjects.join(',')}`);
  };*/

  const handleQuickStart = () => {
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    navigate(`/interview/start?subjects=${randomSubject.id}&type=quick`);
  };

  const handleTimerTest = () => {
    if (selectedSubjects.length === 0) {
      alert('Select at least one subject');
      return;
    }
    navigate(`/interview/start?subjects=${selectedSubjects.join(',')}&type=timed`);
  };

  const handleMockInterview = () => {
    if (selectedSubjects.length === 0) {
      alert('Select at least one subject');
      return;
    }
    navigate(`/interview/start?subjects=${selectedSubjects.join(',')}&type=mock`);
  };

  return (
    <div className="interview-frame">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🤖 AI Coach Interview</h1>
          <p>Upload your resume and select subjects to start your personalized interview</p>
        </div>
      </div>
{/* Upload Resume Frame - SUPER COMPACT */}
<div className="upload-frame-mini">
  <div className="upload-mini-header">
    <h2><b>📄 Upload Resume (Optional)</b></h2>
  </div>
  
  <div className="upload-mini-area">
    <input
      type="file"
      id="resumeUpload"
      accept=".pdf,.doc,.docx,.txt"
      onChange={handleResumeUpload}
      className="file-input-mini"
    />
    <label htmlFor="resumeUpload" className="upload-mini-box">
      {resumeFile ? (
        <div className="file-uploaded-mini">
          <div className="file-icon-mini">📄</div>
          <div className="file-info-mini">
            <span className="file-name-mini">{resumeFile.name}</span>
            <div className="file-meta-mini">
              <span className="file-size-mini">{Math.round(resumeFile.size / 1024)} KB</span>
              <span className="file-status-mini">Uploaded</span>
            </div>
          </div>
          <div className="upload-actions-mini">
            <button 
              className="change-btn-mini"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('resumeUpload').click();
              }}
            >
              Change
            </button>
            <button 
              className="remove-btn-mini"
              onClick={(e) => {
                e.preventDefault();
                setResumeFile(null);
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-placeholder-mini">
          <div className="upload-icon-mini">📁</div>
          <div className="upload-text-mini">
            <span>Browse Files to Upload Resume</span>
            <span className="upload-hint-mini">PDF, DOC, DOCX, TXT (Max 5MB)</span>
          </div>
          <button className="browse-btn-mini">
            Browse
          </button>
        </div>
      )}
    </label>
  </div>
</div>
      {/* Select Tests Section */}
      <div className="tests-frame">
        <div className="tests-header">
          <h2>📚 Select Interview Types</h2>
          <p>Choose subjects for your interview (select multiple)</p>
          <div className="selected-count-display">
            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
          </div>
        </div>
        
        <div className="subjects-grid">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className={`subject-item ${selectedSubjects.includes(subject.id) ? 'selected' : ''}`}
              onClick={() => handleSubjectToggle(subject.id)}
            >
              <div className="subject-icon" style={{ background: subject.color }}>
                {subject.icon}
              </div>
              <div className="subject-info">
                <span className="subject-name">{subject.title}</span>
                <div className="subject-topics">
                  <div className="topics-list">
                    {subject.topics.map((topic, index) => (
                      <span key={index} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                </div>
              </div>
              {selectedSubjects.includes(subject.id) && (
                <div className="check-mark">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Interview Options Section */}
      <div className="options-frame">
        <div className="options-header">
          <h2>🎯 Interview Formats</h2>
          <p>Choose your preferred interview format</p>
        </div>
        
        <div className="options-grid">
          {/* Timer Test */}
          <div className="option-card timer-card">
            <div className="option-icon">⏱️</div>
            <h3>Timer Test</h3>
            <p>Practice with time pressure. Simulates real interview timing.</p>
            <div className="option-details">
              <span className="detail">15-20 questions</span>
              <span className="detail">•</span>
              <span className="detail">AI Feedback</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleTimerTest}
              disabled={selectedSubjects.length === 0}
            >
              Start Timer Test
            </button>
          </div>

          {/* Mock Interview */}
          <div className="option-card mock-card">
            <div className="option-icon">🎤</div>
            <h3>Mock Interview</h3>
            <p>Full interview simulation with AI feedback and scoring.</p>
            <div className="option-details">
              <span className="detail">Complete Simulation</span>
              <span className="detail">•</span>
              <span className="detail">Detailed Report</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleMockInterview}
              disabled={selectedSubjects.length === 0}
            >
              Start Mock Interview
            </button>
          </div>

          {/* Quick Random */}
          <div className="option-card quick-card">
            <div className="option-icon">⚡</div>
            <h3>Quick Random</h3>
            <p>Quick practice session with random questions from any subject.</p>
            <div className="option-details">
              <span className="detail">5-10 questions</span>
              <span className="detail">•</span>
              <span className="detail">Instant Start</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleQuickStart}
            >
              Quick Random Start
            </button>
          </div>
        </div>
      </div>
      {/* Minimal Footer JSX */}
<footer className="minimal-footer">
  <div className="minimal-footer-content">
    <h3><b>InterviewPrep AI</b></h3>
    <p>Master your next interview with AI-powered preparation tools and personalized feedback.</p>
    <div className="minimal-copyright">
      © 2024 InterviewPrep AI. All Rights Reserved.
    </div>
  </div>
</footer>
    </div>
  );
};

export default Interview;