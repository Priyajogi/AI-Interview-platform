// src/components/InterviewPage.js - FIXED VERSION (Interview ID Hidden from UI)
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './InterviewPage.css';

const InterviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get data from navigation state (passed from Interview.js)
  const [interviewId] = useState(location.state?.interviewId);
  const [questions, setQuestions] = useState(location.state?.initialQuestions || []);
  const [interviewType] = useState(location.state?.interviewType || 'quick');
  const [subjects] = useState(location.state?.subjects || []);
  
  // Voice recognition states
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Interview states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [totalTimer, setTotalTimer] = useState(0);
  const [answerTimer, setAnswerTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const recognitionRef = useRef(null);
  
  // Fix: Use useMemo for currentQuestion to prevent unnecessary re-renders
  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex] || {};
  }, [questions, currentQuestionIndex]);
  
  // Format time
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Get interview type name
  const getInterviewTypeName = useCallback((type) => {
    const types = {
      'quick': 'Quick Random (5 questions)',
      'timed': 'Timer Test (10 questions)',
      'mock': 'Mock Interview (15 questions)'
    };
    return types[type] || 'AI Interview';
  }, []);
  
  // Get subject names
  const getSubjectNames = useCallback(() => {
    const subjectMap = {
      'os': 'Operating Systems',
      'cn': 'Computer Networks',
      'dbms': 'Database Systems',
      'dsa': 'Data Structures',
      'oop': 'OOP Design',
      'behavioral': 'Behavioral',
      'basic': 'Basic Interview',
      'full': 'Full Interview',
      'resume': 'Resume Based'
    };
    
    return subjects.map(s => subjectMap[s] || s).join(', ');
  }, [subjects]);
  
  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setMicError('Speech recognition not supported in this browser');
      return null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setMicError('');
      setDebugInfo('🎤 Listening... Speak now');
      setRecordingTime(0); // Reset recording time
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + (prev ? ' ' : '') + final);
      }
      
      if (interim) {
        setInterimTranscript(interim);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        setMicError('Microphone access denied. Please allow microphone access.');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    return recognition;
  }, []);
  
  // Start/Stop listening
  const toggleListening = useCallback(async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setIsTimerRunning(false);
    } else {
      try {
        const recognition = initializeSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
          setIsTimerRunning(true);
          setAnswerTimer(currentQuestion.timeLimit || 60);
          
          // Start recording timer
          const timer = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
          
          // Cleanup timer on stop
          setTimeout(() => {
            clearInterval(timer);
          }, (currentQuestion.timeLimit || 60) * 1000);
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setMicError('Failed to start microphone');
      }
    }
  }, [isListening, initializeSpeechRecognition, currentQuestion.timeLimit]);
  
  // Submit answer to backend
  const submitAnswerToServer = useCallback(async (questionId, answer) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !interviewId) {
        console.error('No authentication token or interview ID');
        return false;
      }
      
      const response = await fetch(`http://localhost:5000/api/ai/interview/${interviewId}/answers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: { [questionId]: answer },
          score: null,
          feedback: null
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return false;
    }
  }, [interviewId]);
  
  // Handle answer submission
  const handleAnswerSubmit = useCallback(async () => {
    if (!transcript.trim()) {
      alert('Please speak or type your answer before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    
    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsTimerRunning(false);
    }
    
    // Save answer locally
    const questionId = currentQuestion.id || currentQuestionIndex + 1;
    const newAnswers = {
      ...answers,
      [questionId]: transcript.trim()
    };
    setAnswers(newAnswers);
    
    // Submit to server
    const submitted = await submitAnswerToServer(questionId, transcript.trim());
    
    if (!submitted) {
      console.warn('Failed to save answer to server, but continuing locally');
    }
    
    // Clear transcript
    setTranscript('');
    setInterimTranscript('');
    setRecordingTime(0);
    setDebugInfo('');
    
    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerTimer(questions[currentQuestionIndex + 1]?.timeLimit || 60);
    } else {
      setShowResults(true);
    }
    
    setIsSubmitting(false);
  }, [
    transcript, 
    isListening, 
    currentQuestion, 
    currentQuestionIndex, 
    answers, 
    questions, 
    submitAnswerToServer
  ]);
  
  // Fetch interview questions if not in state
  useEffect(() => {
    const fetchInterviewQuestions = async () => {
      if (questions.length === 0 && interviewId) {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/ai/interview/${interviewId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.interview) {
              setQuestions(data.interview.questions || []);
            }
          }
        } catch (error) {
          console.error('Error fetching interview:', error);
          alert('Failed to load interview questions. Please try again.');
          navigate('/interview');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchInterviewQuestions();
  }, [questions.length, interviewId, navigate]);
  
  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (isTimerRunning && answerTimer > 0) {
      const timer = setInterval(() => {
        setAnswerTimer(prev => {
          if (prev <= 1) {
            handleAnswerSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isTimerRunning, answerTimer, handleAnswerSubmit]);
  
  // Total timer
  useEffect(() => {
    let interval;
    if (interviewStarted && !showResults) {
      interval = setInterval(() => {
        setTotalTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [interviewStarted, showResults]);
  
  // Start interview
  const handleStartInterview = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setInterviewStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTotalTimer(0);
      setAnswerTimer(questions[0]?.timeLimit || 60);
      setMicError('');
      
    } catch (error) {
      console.error('Microphone access error:', error);
      setMicError('Microphone access required. Please allow microphone permissions.');
    }
  }, [questions]);
  
  // Calculate progress
  const progress = interviewStarted ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  
  // ============= RENDER LOGIC =============
  
  // Loading state
  if (isLoading) {
    return (
      <div className="interview-start-screen">
        <div className="start-screen-content">
          <h1>🤖 Loading AI Interview...</h1>
          <div className="ai-loading">
            <div className="ai-spinner">🤖</div>
            <p>Fetching your personalized questions...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // No questions loaded
  if (questions.length === 0 && !isLoading) {
    return (
      <div className="interview-start-screen">
        <div className="start-screen-content">
          <h1>❌ No Interview Found</h1>
          <p>Unable to load interview questions. Please go back and try again.</p>
          <button 
            className="back-btn" 
            onClick={() => navigate('/interview')}
            style={{ marginTop: '20px' }}
          >
            ← Back to Interview Selection
          </button>
        </div>
      </div>
    );
  }
  
  // RESULTS SCREEN
  if (showResults) {
    return (
      <div className="results-screen">
        <div className="results-content">
          <h1>🎉 AI Interview Completed!</h1>
          <p className="subtitle">Great job on completing the AI-generated interview</p>
          
          <div className="results-stats">
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <h3>{formatTime(totalTimer)}</h3>
                <p>Total Time</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{Object.keys(answers).length}/{questions.length}</h3>
                <p>Questions Answered</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🤖</div>
              <div className="stat-content">
                <h3>AI Generated</h3>
                <p>Powered by Llama 3.1</p>
              </div>
            </div>
          </div>
          
          <div className="answer-review">
            <h3>📝 Your Answers:</h3>
            {Object.entries(answers).map(([questionId, answer]) => {
              const question = questions.find(q => q.id === parseInt(questionId) || q.id === questionId);
              return (
                <div key={questionId} className="review-item">
                  <h4>Q: {question?.question || `Question ${questionId}`}</h4>
                  <p><strong>Your Answer:</strong> {answer}</p>
                  <div className="answer-meta">
                    <span>{answer.split(' ').length} words</span>
                    {question?.difficulty && (
                      <span className={`difficulty-badge difficulty-${question.difficulty}`}>
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="action-buttons">
            <button className="home-btn" onClick={() => navigate('/interview')}>
              🏠 Back to Dashboard
            </button>
            <button 
              className="practice-btn" 
              onClick={() => window.location.reload()}
            >
              🔄 Practice Another Interview
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // START SCREEN (INTERVIEW ID REMOVED FROM DISPLAY)
  if (!interviewStarted) {
    return (
      <div className="interview-start-screen">
        <div className="start-screen-content">
          <h1>🤖 {getInterviewTypeName(interviewType)}</h1>
          <p className="subtitle">AI-Generated Interview • Powered by Groq + Llama 3.1</p>
          
          <div className="interview-details">
            <div className="detail-card">
              <div className="detail-icon">🤖</div>
              <div className="detail-content">
                <h3>AI Generated</h3>
                <p>Questions personalized for you</p>
              </div>
            </div>
            
            <div className="detail-card">
              <div className="detail-icon">📊</div>
              <div className="detail-content">
                <h3>{questions.length} Questions</h3>
                <p>Total questions in this session</p>
              </div>
            </div>
            
            <div className="detail-card">
              <div className="detail-icon">🎤</div>
              <div className="detail-content">
                <h3>Voice Answer</h3>
                <p>Speak your answers - AI transcription</p>
              </div>
            </div>
          </div>
          
          <div className="instructions">
            <h3>📋 Interview Details:</h3>
            <div className="details-grid">
              <div className="detail-item">
                <strong>Subjects:</strong> {getSubjectNames()}
              </div>
              {/* INTERVIEW ID REMOVED - Users don't need to see this */}
              <div className="detail-item">
                <strong>Questions:</strong> {questions.length} total
              </div>
              <div className="detail-item">
                <strong>AI Model:</strong> Llama 3.1 8B
              </div>
            </div>
            
            <h3 style={{ marginTop: '20px' }}>🎤 Instructions:</h3>
            <ul>
              <li>Click <strong>🎤 Start Recording</strong> to begin your answer</li>
              <li>Speak clearly at a normal pace</li>
              <li>Answer will auto-submit when timer reaches 0</li>
              <li>You can also type manually if needed</li>
              <li>Answers are saved to your profile automatically</li>
            </ul>
            
            {micError && (
              <div className="mic-error">
                ⚠️ {micError}
              </div>
            )}
          </div>
          
          <button 
            className="start-now-btn" 
            onClick={handleStartInterview}
          >
            🚀 Start AI Interview Now
          </button>
          
          <button 
            className="back-btn" 
            onClick={() => navigate('/interview')}
            style={{ marginTop: '15px' }}
          >
            ← Choose Different Interview
          </button>
        </div>
      </div>
    );
  }
  
  // MAIN INTERVIEW INTERFACE
  return (
    <div className="interview-page">
      {/* Header */}
      <header className="interview-header">
        <div className="header-left">
          <h2>🤖 {getInterviewTypeName(interviewType)}</h2>
          <div className="progress-info">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="save-indicator">
              <span className="save-icon">💾</span>
              Auto-saving...
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{answerTimer}s</span>
          </div>
        </div>
      </header>
      
      {debugInfo && (
        <div className="debug-banner">
          <small>{debugInfo}</small>
        </div>
      )}
      
      <main className="interview-content">
        <div className="question-section">
          <div className="question-header">
            <span className="question-category">
              {currentQuestion.category || 'AI Generated'}
            </span>
            {currentQuestion.difficulty && (
              <span className={`difficulty-badge difficulty-${currentQuestion.difficulty}`}>
                {currentQuestion.difficulty.toUpperCase()}
              </span>
            )}
            <span className="ai-badge">🤖 AI</span>
          </div>
          
          <div className="question-text">
            <h3>{currentQuestion.question}</h3>
            <div className="question-time">
              <span className="time-icon">⏱️</span>
              Time limit: {currentQuestion.timeLimit || 60} seconds
              {isTimerRunning && (
                <span className="timer-running"> • Timer running...</span>
              )}
            </div>
          </div>
          
          <div className="answer-section">
            <div className="voice-controls">
              <div className="control-buttons">
                <button 
                  className={`record-btn ${isListening ? 'recording' : ''}`}
                  onClick={toggleListening}
                  disabled={isSubmitting}
                >
                  {isListening ? (
                    <>
                      <span className="recording-indicator"></span>
                      ⏹️ Stop Recording ({answerTimer}s left) - {recordingTime}s
                    </>
                  ) : (
                    '🎤 Start Recording'
                  )}
                </button>
                
                <button 
                  className="manual-btn"
                  onClick={() => {
                    const manualText = prompt('Type your answer:', transcript || '');
                    if (manualText !== null) {
                      setTranscript(manualText);
                      setDebugInfo('✓ Manual input received');
                    }
                  }}
                  disabled={isListening || isSubmitting}
                >
                  ✏️ Type Manually
                </button>
                
                <button 
                  className="clear-btn"
                  onClick={() => {
                    setTranscript('');
                    setInterimTranscript('');
                    setDebugInfo('Cleared answer');
                  }}
                  disabled={(!transcript && !interimTranscript) || isSubmitting}
                >
                  🗑️ Clear
                </button>
              </div>
              
              <div className="recording-status">
                {isListening ? (
                  <div className="listening-status">
                    <span className="pulse-dot"></span>
                    <span className="status-text">
                      Recording... {answerTimer} seconds remaining
                    </span>
                  </div>
                ) : (
                  <div className="ready-status">
                    {transcript ? 'Answer ready to submit' : 'Click 🎤 to start recording'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="transcript-display">
              <h4>🎧 Your Answer:</h4>
              <div className="transcript-container">
                {transcript || interimTranscript ? (
                  <div className="transcript-content">
                    {transcript && (
                      <div className="final-transcript">
                        {transcript}
                      </div>
                    )}
                    
                    {interimTranscript && (
                      <div className="current-transcript">
                        <div className="interim-label">🗣️ Speaking now:</div>
                        <em>{interimTranscript}</em>
                      </div>
                    )}
                    
                    <div className="transcript-meta">
                      <span className="word-count">
                        📊 {transcript.split(' ').filter(w => w.length > 0).length} words
                      </span>
                      {recordingTime > 0 && (
                        <span className="time-count">
                          ⏱️ {recordingTime}s recorded
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-transcript">
                    <p>Your answer will appear here as you speak...</p>
                  </div>
                )}
              </div>
              
              {micError && (
                <div className="transcript-error">
                  ⚠️ {micError}
                </div>
              )}
            </div>
            
            <div className="submit-section">
              <button 
                className="submit-btn"
                onClick={handleAnswerSubmit}
                disabled={!transcript.trim() || isListening || isSubmitting}
              >
                {isSubmitting ? '⏳ Submitting...' : 'Submit Answer & Continue →'}
              </button>
              <div className="submit-hint">
                {currentQuestionIndex < questions.length - 1 
                  ? `${questions.length - currentQuestionIndex - 1} questions remaining`
                  : 'Last question!'}
              </div>
            </div>
            
            {answerTimer <= 10 && answerTimer > 0 && isTimerRunning && (
              <div className="timer-warning">
                ⚠️ Hurry! Only {answerTimer} seconds remaining!
            </div>
            )}
          </div>
        </div>
        
        <div className="controls-section">
          <div className="question-navigation">
            {questions.map((q, index) => (
              <button
                key={q.id || index}
                className={`question-nav-btn ${index === currentQuestionIndex ? 'active' : ''} ${answers[q.id] || answers[index + 1] ? 'answered' : ''}`}
                onClick={() => {
                  if (isListening && recognitionRef.current) {
                    recognitionRef.current.stop();
                    setIsListening(false);
                    setIsTimerRunning(false);
                  }
                  setCurrentQuestionIndex(index);
                  setAnswerTimer(q.timeLimit || 60);
                  setTranscript('');
                  setInterimTranscript('');
                  setRecordingTime(0);
                  setDebugInfo('');
                }}
                disabled={isListening || isSubmitting}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="control-buttons">
            <button 
              className="prev-btn"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  if (isListening && recognitionRef.current) {
                    recognitionRef.current.stop();
                    setIsListening(false);
                    setIsTimerRunning(false);
                  }
                  setCurrentQuestionIndex(prev => prev - 1);
                  setAnswerTimer(questions[currentQuestionIndex - 1]?.timeLimit || 60);
                  setTranscript('');
                  setInterimTranscript('');
                  setRecordingTime(0);
                  setDebugInfo('');
                }
              }}
              disabled={currentQuestionIndex === 0 || isListening || isSubmitting}
            >
              ← Previous
            </button>
            
            <button 
              className="next-btn"
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  if (isListening && recognitionRef.current) {
                    recognitionRef.current.stop();
                    setIsListening(false);
                    setIsTimerRunning(false);
                  }
                  setCurrentQuestionIndex(prev => prev + 1);
                  setAnswerTimer(questions[currentQuestionIndex + 1]?.timeLimit || 60);
                  setTranscript('');
                  setInterimTranscript('');
                  setRecordingTime(0);
                  setDebugInfo('');
                } else {
                  setShowResults(true);
                }
              }}
              disabled={isListening || isSubmitting}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Skip Question →' : 'Finish Interview'}
            </button>
          </div>
        </div>
      </main>
      
      <footer className="tech-info">
        <p>
          <strong>AI Interview</strong> • Powered by Groq + Llama 3.1 • 
          <span className="save-status">💾 Auto-saving to database</span>
        </p>
      </footer>
    </div>
  );
};

export default InterviewPage;