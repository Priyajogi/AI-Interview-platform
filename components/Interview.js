// src/components/Interview.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Interview.css';

const Interview = () => {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
    const file = e.target.files[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📤 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large! Maximum size is 5MB.');
      e.target.value = ''; // Reset input
      return;
    }

    // Check file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Invalid file type! Allowed: PDF, DOC, DOCX, TXT');
      e.target.value = ''; // Reset input
      return;
    }

    setResumeFile(file);
    console.log('✅ File ready for upload:', file.name);
  };

  const uploadResumeFile = async (file) => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    console.log('🚀 Starting upload for:', file.name);
    
    // Create FormData
    const formData = new FormData();
    formData.append('resume', file);

    try {
      setIsUploading(true);
      
      // Get token
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        alert('⚠️ Please login first to upload resume');
        setIsUploading(false);
        return;
      }

      console.log('📤 Sending request to server...');
      console.log('URL: http://localhost:5000/api/resume/upload');
      
      // Upload to backend
      const response = await fetch('http://localhost:5000/api/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📥 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📊 Server response:', data);
      
      if (response.ok && data.success) {
        alert(`✅ Resume uploaded successfully!\n\nFile: ${data.resume.originalName}\nSize: ${data.resume.fileSize}`);
        console.log('✅ Upload successful:', data.resume);
        
        // Store the resume ID for later use
        localStorage.setItem('currentResumeId', data.resume.id);
        
      } else {
        alert(`❌ Upload failed: ${data.error || 'Unknown error'}`);
        console.error('❌ Upload failed:', data);
      }
    } catch (error) {
      console.error('🔥 Network error:', error);
      alert('🔥 Network error. Please check:\n1. Server is running\n2. Check browser console (F12)');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubjectToggle = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  // AI Interview Generation Function
  const startAIGeneratedInterview = async (interviewType) => {
  if (selectedSubjects.length === 0) {
    alert('Select at least one subject');
    return;
  }
  
  console.log('🤖 Starting AI-generated interview...', {
    type: interviewType,
    subjects: selectedSubjects
  });
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first to use AI interviews');
      return;
    }
    
    // Show loading
    setIsGeneratingAI(true);
    
    console.log('📤 Sending request to server...');
    
    // Call AI endpoint
    const response = await fetch('http://localhost:5000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subjects: selectedSubjects,
        interviewType: interviewType
      })
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📊 Server response:', data);
    
    if (data.success) {
      console.log('✅ AI interview generated:', {
        interviewId: data.interviewId,
        questions: data.questions.length,
        isAI: data.isAI
      });
      
      // ✅ Navigate to correct route
      navigate(`/interview/${data.interviewId}`, {
        state: {
          interviewId: data.interviewId,
          initialQuestions: data.questions,
          interviewType: interviewType,
          isAI: data.isAI,
          subjects: selectedSubjects
        }
      });
    } else {
      alert(`Failed to generate AI interview: ${data.error}`);
      console.error('❌ Server error:', data);
    }
    
  } catch (error) {
    console.error('❌ AI interview error:', error);
    alert('Failed to generate AI interview. Please check:\n1. Server is running (localhost:5000)\n2. Check browser console (F12)');
  } finally {
    setIsGeneratingAI(false);
  }
};

  // Updated button handlers to use AI
  const handleQuickStart = () => {
    startAIGeneratedInterview('quick');
  };

  const handleTimerTest = () => {
    startAIGeneratedInterview('timed');
  };

  const handleMockInterview = () => {
    startAIGeneratedInterview('mock');
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
      
      {/* Upload Resume Frame */}
      <div className="upload-frame-mini">
        <div className="upload-mini-header">
          <h2><b>📄 Upload Resume</b></h2>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Required for "Resume Based" AI interviews
          </p>
        </div>
        
        <div className="upload-mini-area">
          <input
            type="file"
            id="resumeUpload"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleResumeUpload}
            className="file-input-mini"
            style={{ display: 'none' }}
          />
          
          {resumeFile ? (
            // File selected state
            <div className="file-uploaded-mini">
              <div className="file-icon-mini">📄</div>
              <div className="file-info-mini">
                <span className="file-name-mini">{resumeFile.name}</span>
                <div className="file-meta-mini">
                  <span className="file-size-mini">{Math.round(resumeFile.size / 1024)} KB</span>
                  <span className="file-status-mini">Ready to upload</span>
                </div>
              </div>
              <div className="upload-actions-mini">
                <button 
                  type="button"
                  className="change-btn-mini"
                  onClick={() => document.getElementById('resumeUpload').click()}
                >
                  Change
                </button>
                <button 
                  type="button"
                  className="remove-btn-mini"
                  onClick={() => setResumeFile(null)}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            // No file selected state
            <div 
              className="upload-placeholder-mini"
              onClick={() => document.getElementById('resumeUpload').click()}
              style={{ cursor: 'pointer' }}
            >
              <div className="upload-icon-mini">📁</div>
              <div className="upload-text-mini">
                <span>Click to Browse Files</span>
                <span className="upload-hint-mini">PDF, DOC, DOCX, TXT (Max 5MB)</span>
              </div>
              <div className="browse-btn-mini">Browse</div>
            </div>
          )}
        </div>
        
        {/* Upload button - only shown when file is selected */}
        {resumeFile && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button 
              className="upload-submit-btn"
              onClick={() => uploadResumeFile(resumeFile)}
              disabled={isUploading}
              style={{
                background: isUploading ? '#cccccc' : '#4361ee',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                width: '100%',
                maxWidth: '300px',
                transition: 'all 0.3s'
              }}
            >
              {isUploading ? '⏳ Uploading...' : '📤 Upload Resume to Server'}
            </button>
            
            {isUploading && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                Uploading... Please wait
              </div>
            )}
          </div>
        )}
      </div>

      {/* Select Tests Section */}
      <div className="tests-frame">
        <div className="tests-header">
          <h2>📚 Select Interview Types</h2>
          <p>Choose subjects for your interview (select multiple)</p>
          <div className="selected-count-display">
            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
            {selectedSubjects.includes('resume') && (
              <span style={{ marginLeft: '10px', color: '#7209b7' }}>
                📄 Resume required
              </span>
            )}
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
          <h2>🎯 AI Interview Formats</h2>
          <p>Powered by Groq + Llama 3.1 AI</p>
        </div>
        
        <div className="options-grid">
          {/* Quick Random */}
          <div className="option-card quick-card">
            <div className="option-icon">⚡</div>
            <h3>Quick Random</h3>
            <p>5 AI-generated questions for quick practice session.</p>
            <div className="option-details">
              <span className="detail">5 questions</span>
              <span className="detail">•</span>
              <span className="detail">5 minutes</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleQuickStart}
              disabled={selectedSubjects.length === 0 || isGeneratingAI}
            >
              {isGeneratingAI ? '🤖 Generating...' : 'Quick Random Start'}
            </button>
          </div>

          {/* Timer Test */}
          <div className="option-card timer-card">
            <div className="option-icon">⏱️</div>
            <h3>Timer Test</h3>
            <p>10 AI-generated questions with time pressure simulation.</p>
            <div className="option-details">
              <span className="detail">10 questions</span>
              <span className="detail">•</span>
              <span className="detail">10-15 minutes</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleTimerTest}
              disabled={selectedSubjects.length === 0 || isGeneratingAI}
            >
              {isGeneratingAI ? '🤖 Generating...' : 'Start Timer Test'}
            </button>
          </div>

          {/* Mock Interview */}
          <div className="option-card mock-card">
            <div className="option-icon">🎤</div>
            <h3>Mock Interview</h3>
            <p>15 comprehensive AI-generated questions for full simulation.</p>
            <div className="option-details">
              <span className="detail">15 questions</span>
              <span className="detail">•</span>
              <span className="detail">20 minutes</span>
            </div>
            <button 
              className="option-btn"
              onClick={handleMockInterview}
              disabled={selectedSubjects.length === 0 || isGeneratingAI}
            >
              {isGeneratingAI ? '🤖 Generating...' : 'Start Mock Interview'}
            </button>
          </div>
        </div>

        {isGeneratingAI && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div className="ai-generating-indicator">
              <div className="ai-spinner">🤖</div>
              <p>AI is generating personalized questions...</p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Using Groq + Llama 3.1 (Usually takes 5-10 seconds)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
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