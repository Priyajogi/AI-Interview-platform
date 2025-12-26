import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './InterviewPage.css';

// Constants for questions
const QUESTIONS_BY_CATEGORY = {
  os: [
    {
      id: 1,
      question: "What is the difference between a process and a thread?",
      type: "conceptual",
      difficulty: "medium",
      timeLimit: 60,
      category: "Process Management"
    },
    {
      id: 2,
      question: "Explain the concept of deadlock and how it can be prevented.",
      type: "conceptual",
      difficulty: "hard",
      timeLimit: 60,
      category: "Process Synchronization"
    },
    {
      id: 3,
      question: "What are the different page replacement algorithms?",
      type: "conceptual",
      difficulty: "medium",
      timeLimit: 60,
      category: "Memory Management"
    }
  ],
  cn: [
    {
      id: 1,
      question: "Explain the TCP/IP model and its layers.",
      type: "conceptual",
      difficulty: "medium",
      timeLimit: 60,
      category: "Network Models"
    },
    {
      id: 2,
      question: "What is the difference between TCP and UDP?",
      type: "comparison",
      difficulty: "easy",
      timeLimit: 60,
      category: "Transport Layer"
    }
  ],
  dsa: [
    {
      id: 1,
      question: "Explain time and space complexity of Binary Search.",
      type: "conceptual",
      difficulty: "easy",
      timeLimit: 60,
      category: "Algorithms"
    },
    {
      id: 2,
      question: "What is the difference between Array and Linked List?",
      type: "comparison",
      difficulty: "medium",
      timeLimit: 60,
      category: "Data Structures"
    }
  ],
  behavioral: [
    {
      id: 1,
      question: "Tell me about yourself.",
      type: "behavioral",
      difficulty: "easy",
      timeLimit: 60,
      category: "Introduction"
    },
    {
      id: 2,
      question: "Describe a time you faced a challenge at work.",
      type: "behavioral",
      difficulty: "medium",
      timeLimit: 60,
      category: "Experience"
    }
  ]
};

const CATEGORY_NAMES = {
  os: 'Operating Systems',
  cn: 'Computer Networks',
  dbms: 'Database Management',
  dsa: 'Data Structures & Algorithms',
  oop: 'OOP & System Design',
  behavioral: 'Behavioral',
  'resume-ai': 'AI Resume Interview',
  'full-mock': 'Full Mock Interview'
};

const InterviewPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  // Voice recognition states
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Interview states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Timer state
  const [answerTimer, setAnswerTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Interview data states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [totalTimer, setTotalTimer] = useState(0);
  
  // Refs
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const cleanupFunctionsRef = useRef([]);
  
  // Memoized questions
  const questions = useMemo(() => QUESTIONS_BY_CATEGORY[categoryId] || QUESTIONS_BY_CATEGORY.os, [categoryId]);
  const currentQuestion = questions[currentQuestionIndex];
  
  // Format time
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Get category name
  const getCategoryName = useCallback((catId) => 
    CATEGORY_NAMES[catId] || 'Technical Interview', 
    []
  );
  
  // ============= CORE FUNCTIONS =============
  
  // Stop listening
  const stopListening = useCallback(() => {
    console.log('⏹️ Stopping listening...');
    
    isListeningRef.current = false;
    setIsListening(false);
    setDebugInfo('Processing...');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Speech recognition already stopped');
      }
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    analyserRef.current = null;
    setVolumeLevel(0);
    
    setTimeout(() => {
      if (interimTranscript) {
        setTranscript(prev => prev + (prev ? ' ' : '') + interimTranscript);
        setInterimTranscript('');
      }
      setDebugInfo('Ready');
    }, 500);
  }, [interimTranscript]);
  
  // Silence detection
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    silenceTimerRef.current = setTimeout(() => {
      if (isListening && transcript && !interimTranscript) {
        console.log('🤫 No speech detected, auto-stopping...');
        stopListening();
      }
    }, 10000);
    
    cleanupFunctionsRef.current.push(() => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    });
  }, [isListening, transcript, interimTranscript, stopListening]);
  
  // Initialize Web Speech API
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setBrowserSupport(false);
      setMicError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      isListeningRef.current = true;
      setMicError('');
      setDebugInfo('🎤 Listening... Speak now');
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      let hasNewFinal = false;
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcriptText = result[0].transcript.trim();
        
        if (result.isFinal) {
          if (transcriptText && !final.includes(transcriptText)) {
            final += (final ? ' ' : '') + transcriptText;
            hasNewFinal = true;
          }
        } else {
          if (transcriptText) {
            interim = transcriptText;
          }
        }
      }
      
      if (hasNewFinal) {
        setTranscript(prev => {
          const newText = prev ? prev + ' ' + final : final;
          return newText;
        });
        setDebugInfo(`✓ Added: "${final}"`);
      }
      
      if (interim) {
        setInterimTranscript(interim);
        setDebugInfo(`⏳ Listening: "${interim}"`);
      }
      
      if (final || interim) {
        resetSilenceTimer();
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setDebugInfo('⏸️ Speech paused');
        return;
      }
      
      if (event.error === 'not-allowed') {
        setMicError('Microphone access was denied. Please allow microphone access.');
      } else if (event.error === 'audio-capture') {
        setMicError('No microphone found. Please check your microphone.');
      } else {
        setMicError(`Speech recognition error: ${event.error}`);
      }
      
      setIsListening(false);
      isListeningRef.current = false;
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      
      if (isListeningRef.current) {
        setDebugInfo('🔄 Restarting speech recognition...');
        
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        
        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting:', error);
              setIsListening(false);
              isListeningRef.current = false;
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };
    
    return recognition;
  }, [resetSilenceTimer]);
  
  // Initialize audio visualization
  const initializeAudioVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
    } catch (error) {
      console.log('Audio visualization failed:', error);
    }
  }, []);
  
  // Monitor volume level
  const monitorVolume = useCallback(() => {
    const updateVolume = () => {
      if (!analyserRef.current || !isListening) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volume = Math.min(100, Math.max(0, (average / 128) * 100));
      setVolumeLevel(volume);
      
      if (isListening) {
        requestAnimationFrame(updateVolume);
      }
    };
    
    updateVolume();
  }, [isListening]);
  
  // Start listening
  const startListening = useCallback(async () => {
    console.log('🔴 Starting listening...');
    setDebugInfo('Initializing...');
    
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Browser does not support speech recognition');
      }
      
      const recognition = initializeSpeechRecognition();
      if (!recognition) {
        throw new Error('Failed to initialize speech recognition');
      }
      recognitionRef.current = recognition;
      
      await initializeAudioVisualizer();
      
      setTranscript('');
      setInterimTranscript('');
      setRecordingTime(0);
      setMicError('');
      
      recognition.start();
      
      monitorVolume();
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) {
            stopListening();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      cleanupFunctionsRef.current.push(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      });
      
      console.log('✅ Listening started');
      
    } catch (error) {
      console.error('❌ Error starting listening:', error);
      setMicError(`Failed to start listening: ${error.message}`);
      setIsListening(false);
      setDebugInfo('Error');
    }
  }, [initializeSpeechRecognition, initializeAudioVisualizer, monitorVolume, stopListening]);
  
  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);
  
  // Start/Stop listening for INTERVIEW mode
  const toggleListeningInterview = useCallback(async () => {
    if (isListening) {
      stopListening();
      setIsTimerRunning(false);
    } else {
      await startListening();
      setIsTimerRunning(true);
      setAnswerTimer(60);
    }
  }, [isListening, startListening, stopListening]);
  
  // ============= INTERVIEW FUNCTIONS =============
  
  // Go to next question
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerTimer(60);
      setTranscript('');
      setInterimTranscript('');
      setIsTimerRunning(false);
      setDebugInfo('');
      setRecordingTime(0);
    } else {
      setShowResults(true);
      localStorage.setItem(`interview_${categoryId}_results`, 'true');
    }
  }, [currentQuestionIndex, questions.length, categoryId]);
  
  // Auto-submit function
  const handleAutoSubmit = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    
    if (transcript.trim()) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: transcript.trim()
      }));
    }
    
    goToNextQuestion();
  }, [isListening, stopListening, transcript, currentQuestion.id, goToNextQuestion]);
  
  // Handle answer submission
  const handleAnswerSubmit = useCallback(() => {
    if (!transcript.trim()) {
      alert('Please speak or type your answer before submitting.');
      return;
    }
    
    console.log('✅ Submitting answer...');
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: transcript.trim()
    }));
    
    goToNextQuestion();
  }, [transcript, currentQuestion.id, goToNextQuestion]);
  
  // Manual text input
  const handleManualInput = useCallback(() => {
    const manualText = prompt('Type your answer:', transcript || '');
    if (manualText !== null) {
      setTranscript(manualText);
      setMicError('');
    }
  }, [transcript]);
  
  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setMicError('');
  }, []);
  
  // Save interview state function
  const saveInterviewState = useCallback(() => {
    if (interviewStarted && !showResults) {
      localStorage.setItem(`interview_${categoryId}_questionIndex`, currentQuestionIndex.toString());
      localStorage.setItem(`interview_${categoryId}_answers`, JSON.stringify(answers));
      localStorage.setItem(`interview_${categoryId}_timer`, totalTimer.toString());
      localStorage.setItem(`interview_${categoryId}_started`, 'true');
      localStorage.setItem(`interview_last_category`, categoryId);
    }
  }, [interviewStarted, showResults, categoryId, currentQuestionIndex, answers, totalTimer]);
  
  // Start interview
  const handleStartInterview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setInterviewStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTotalTimer(0);
      setAnswerTimer(60);
      setIsTimerRunning(false);
      setMicError('');
      
    } catch (error) {
      console.error('❌ Start interview error:', error);
      setMicError('Microphone access required. Please allow microphone permissions.');
    }
  }, []);
  
  // Restart interview - Updated version
  const handleRestartInterview = useCallback(() => {
    const confirmRestart = window.confirm('Are you sure you want to restart the interview? Your progress will be lost.');
    if (confirmRestart) {
      // Clear localStorage
      localStorage.removeItem(`interview_${categoryId}_questionIndex`);
      localStorage.removeItem(`interview_${categoryId}_answers`);
      localStorage.removeItem(`interview_${categoryId}_timer`);
      localStorage.removeItem(`interview_${categoryId}_started`);
      localStorage.removeItem(`interview_${categoryId}_results`);
      localStorage.removeItem(`interview_last_category`);
      
      // Reset all state
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTotalTimer(0);
      setInterviewStarted(false);
      setShowResults(false);
      setTranscript('');
      setInterimTranscript('');
      setAnswerTimer(60);
      setIsTimerRunning(false);
      setMicError('');
      setDebugInfo('');
      setRecordingTime(0);
      
      console.log('🔄 Interview completely reset');
    }
  }, [categoryId]);
  
  // Resume saved interview
  const handleResumeInterview = useCallback(() => {
    setInterviewStarted(true);
  }, []);
  
  // ============= EFFECTS =============
  
  // Save state when relevant data changes
  useEffect(() => {
    saveInterviewState();
  }, [saveInterviewState]);
  
  // Timer countdown effect
  useEffect(() => {
    if (isTimerRunning && answerTimer > 0) {
      const timerId = setInterval(() => {
        setAnswerTimer(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      cleanupFunctionsRef.current.push(() => clearInterval(timerId));
      return () => clearInterval(timerId);
    }
  }, [isTimerRunning, answerTimer, handleAutoSubmit]);
  
  // Total timer for interview
  useEffect(() => {
    let interval;
    if (interviewStarted && !showResults) {
      interval = setInterval(() => {
        setTotalTimer(prev => prev + 1);
      }, 1000);
      
      cleanupFunctionsRef.current.push(() => clearInterval(interval));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [interviewStarted, showResults]);
  
  // Check for saved interview on page load
  useEffect(() => {
    const checkSavedInterview = () => {
      const savedCategory = localStorage.getItem('interview_last_category');
      
      if (savedCategory && savedCategory !== categoryId) {
        return;
      }
      
      const savedStarted = localStorage.getItem(`interview_${categoryId}_started`);
      if (savedStarted === 'true') {
        const savedIndex = localStorage.getItem(`interview_${categoryId}_questionIndex`);
        const savedAnswers = localStorage.getItem(`interview_${categoryId}_answers`);
        const savedTimer = localStorage.getItem(`interview_${categoryId}_timer`);
        const savedResults = localStorage.getItem(`interview_${categoryId}_results`);
        
        if (savedIndex) setCurrentQuestionIndex(parseInt(savedIndex));
        if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
        if (savedTimer) setTotalTimer(parseInt(savedTimer));
        if (savedResults === 'true') setShowResults(true);
      }
    };
    
    checkSavedInterview();
  }, [categoryId]);
  
  // Cleanup all effects
  useEffect(() => {
    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
      
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);
  
  // Calculate progress
  const progress = interviewStarted ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  
  // Check if there's saved progress (excluding completed interviews) - Updated
  const hasSavedProgress = useMemo(() => {
    const savedStarted = localStorage.getItem(`interview_${categoryId}_started`);
    const savedResults = localStorage.getItem(`interview_${categoryId}_results`);
    
    // If interview was completed (results saved), don't show as saved progress
    if (savedResults === 'true') {
      return false;
    }
    
    return Object.keys(answers).length > 0 || savedStarted === 'true';
  }, [answers, categoryId]);
  
  // ============= RENDER LOGIC =============
  
  // 1. RESULTS SCREEN - Updated
  if (showResults) {
    return (
      <div className="results-screen">
        <div className="results-content">
          <h1>🎉 Interview Completed!</h1>
          <p className="subtitle">Great job on completing the voice interview</p>
          
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
              <div className="stat-icon">🎤</div>
              <div className="stat-content">
                <h3>Voice Only</h3>
                <p>Interview Mode</p>
              </div>
            </div>
          </div>
          
          <div className="answer-review">
            <h3>📝 Your Answers:</h3>
            {Object.entries(answers).map(([questionId, answer]) => {
              const question = questions.find(q => q.id === parseInt(questionId));
              return (
                <div key={questionId} className="review-item">
                  <h4>Q: {question?.question}</h4>
                  <p><strong>Your Answer:</strong> {answer}</p>
                  <div className="answer-meta">
                    <span>{answer.split(' ').length} words</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="action-buttons">
            <button className="review-btn" onClick={() => navigate('/interview-feedback')}>
              📊 Get AI Feedback
            </button>
            <button 
              className="practice-btn" 
              onClick={() => {
                // Clear all saved interview data
                localStorage.removeItem(`interview_${categoryId}_questionIndex`);
                localStorage.removeItem(`interview_${categoryId}_answers`);
                localStorage.removeItem(`interview_${categoryId}_timer`);
                localStorage.removeItem(`interview_${categoryId}_started`);
                localStorage.removeItem(`interview_${categoryId}_results`);
                localStorage.removeItem(`interview_last_category`);
                
                // Reset all state
                setCurrentQuestionIndex(0);
                setAnswers({});
                setTotalTimer(0);
                setInterviewStarted(false);
                setShowResults(false);
                setTranscript('');
                setInterimTranscript('');
                setAnswerTimer(60);
                setIsTimerRunning(false);
                setMicError('');
                setDebugInfo('');
                setRecordingTime(0);
              }}
            >
              🔄 Practice Same Interview Again
            </button>
            <button 
              className="home-btn" 
              onClick={() => {
                // Clear this interview data when going to dashboard
                localStorage.removeItem(`interview_${categoryId}_results`);
                navigate('/dashboard');
              }}
            >
              🏠 Back to Dashboard
            </button>
          </div>
          
          <div className="interview-options">
            
          </div>
        </div>
      </div>
    );
  }
  
  // 2. START SCREEN
  if (!interviewStarted) {
    return (
      <div className="interview-start-screen">
        <div className="start-screen-content">
          <h1>🎤 {getCategoryName(categoryId)} Interview</h1>
          <p className="subtitle">Voice-only interview session - Speak your answers</p>
          
          <div className="interview-details">
            <div className="detail-card">
              <div className="detail-icon">🎤</div>
              <div className="detail-content">
                <h3>Voice Only</h3>
                <p>Speak your answers - no typing</p>
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
              <div className="detail-icon">⏱️</div>
              <div className="detail-content">
                <h3>{questions.length} mins</h3>
                <p>Estimated completion time</p>
              </div>
            </div>
          </div>
          
          {hasSavedProgress && (
            <div className="resume-section">
              <div className="resume-card">
                <div className="resume-icon">⏪</div>
                <div className="resume-content">
                  <h4>Resume Your Interview</h4>
                  <p>You have answered {Object.keys(answers).length} out of {questions.length} questions</p>
                  <div className="resume-stats">
                    <span>⏱️ Last saved: {formatTime(totalTimer)}</span>
                    <span>📍 Question {currentQuestionIndex + 1} of {questions.length}</span>
                  </div>
                  <button className="resume-btn" onClick={handleResumeInterview}>
                    Continue Where You Left Off →
                  </button>
                  <button className="restart-btn" onClick={handleRestartInterview}>
                    🗑️ Start Fresh
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="instructions">
            <h3>🎤 Voice Interview Instructions:</h3>
            <ul>
              <li><strong>Speak clearly</strong> and at a normal pace</li>
              <li>Click <strong>🎤 Start Speaking</strong> to begin recording</li>
              <li>Speak continuously - don't pause for too long</li>
              <li>Click <strong>⏹️ Stop</strong> when finished</li>
              <li>Click <strong>Submit Answer →</strong> to proceed</li>
              <li><strong>Microphone access is required</strong></li>
              <li><strong>Progress is auto-saved</strong> - you can close and return</li>
            </ul>
            
            <div className="browser-check">
              <h4>🌐 Browser Compatibility Check:</h4>
              <div className="browser-status">
                {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? (
                  <div className="status-success">
                    ✅ Your browser supports speech recognition!
                  </div>
                ) : (
                  <div className="status-error">
                    ❌ Your browser doesn't support speech recognition.
                    <p>Please switch to <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.</p>
                  </div>
                )}
              </div>
            </div>
            
            {micError && (
              <div className="mic-error">
                ⚠️ {micError}
              </div>
            )}
            
            <div className="mic-test">
              <h4>🔧 Test Your Microphone:</h4>
              <p>Click below and say "Hello, this is a test" to check:</p>
              <button 
                className={`mic-test-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
              >
                {isListening ? `⏹️ Stop Test (${recordingTime}s)` : '🎤 Test Speech Recognition'}
              </button>
              
              <div className="test-controls">
                <button 
                  className="manual-input-btn"
                  onClick={handleManualInput}
                >
                  ✏️ Type Manually
                </button>
              </div>
              
              {(transcript || interimTranscript) && (
                <div className="test-transcript">
                  <h5>Test Result:</h5>
                  <div className="test-transcript-content">
                    {transcript && <p><strong>Final:</strong> {transcript}</p>}
                    {interimTranscript && <p className="interim"><strong>Speaking:</strong> {interimTranscript}</p>}
                  </div>
                </div>
              )}
              
              {debugInfo && (
                <div className="debug-info">
                  <p><small>{debugInfo}</small></p>
                </div>
              )}
              
              <div className="volume-indicator">
                {isListening && (
                  <div className="volume-bar">
                    <div 
                      className="volume-fill"
                      style={{ width: `${volumeLevel}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button 
            className="start-now-btn" 
            onClick={handleStartInterview}
            disabled={!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
          >
            🚀 {hasSavedProgress ? 'Start New Interview' : 'Start Interview Now'}
          </button>
          
          <p className="note">
            💡 <strong>Tip:</strong> Your progress is automatically saved. You can close the browser and return later.
          </p>
          
          <button className="back-btn" onClick={() => navigate('/interview')}>
            ← Choose Different Interview
          </button>
        </div>
      </div>
    );
  }
  
  // 3. MAIN INTERVIEW INTERFACE
  return (
    <div className="interview-page">
      {/* Header */}
      <header className="interview-header">
        <div className="header-left">
          <h2>🎤 {getCategoryName(categoryId)} Interview</h2>
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
              Auto-saved
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{answerTimer}s</span>
          </div>
          <button 
            className="pause-btn" 
            onClick={() => {
              if (isListening) {
                toggleListeningInterview();
              }
            }}
            disabled={!isListening}
          >
            ⏸️ Pause
          </button>
        </div>
      </header>
      
      {debugInfo && (
        <div className="debug-banner">
          <small>{debugInfo}</small>
        </div>
      )}
      
      {isListening && (
        <div className="volume-visualizer">
          <div className="volume-bar">
            <div 
              className="volume-fill"
              style={{ width: `${volumeLevel}%` }}
            ></div>
          </div>
          <span className="volume-text">Microphone Level: {Math.round(volumeLevel)}%</span>
        </div>
      )}
      
      <main className="interview-content">
        <div className="question-section">
          <div className="question-header">
            <span className="question-category">{currentQuestion.category}</span>
            <span className={`difficulty-badge difficulty-${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty.toUpperCase()}
            </span>
          </div>
          
          <div className="question-text">
            <h3>{currentQuestion.question}</h3>
            <div className="question-time">
              <span className="time-icon">⏱️</span>
              Time limit: {currentQuestion.timeLimit} seconds
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
                  onClick={toggleListeningInterview}
                >
                  {isListening ? (
                    <>
                      <span className="recording-indicator"></span>
                      ⏹️ Stop Recording ({answerTimer}s left)
                    </>
                  ) : (
                    '🎤 Start Recording (60s timer starts)'
                  )}
                </button>
                
                <button 
                  className="manual-btn"
                  onClick={handleManualInput}
                  disabled={isListening}
                >
                  ✏️ Type Manually
                </button>
                
                <button 
                  className="clear-btn"
                  onClick={clearTranscript}
                  disabled={isListening || (!transcript && !interimTranscript)}
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
                      <small className="status-hint">(Auto-submits when timer reaches 0)</small>
                    </span>
                  </div>
                ) : (
                  <div className="ready-status">
                    {transcript ? `Ready to submit (${answerTimer}s left)` : 'Click 🎤 to start recording (60s timer will start)'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="transcript-display">
              <h4>🎧 Your Answer (Live Transcription):</h4>
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
                      <span className="time-count">
                        ⏱️ {recordingTime}s recorded
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-transcript">
                    <p>Your transcribed answer will appear here as you speak...</p>
                    <div className="voice-tips">
                      <h5>🎤 Speaking Tips:</h5>
                      <ul>
                        <li>Speak clearly and at a normal pace</li>
                        <li>Don't pause for more than 2-3 seconds</li>
                        <li>If transcription stops, click "Start Recording" again</li>
                        <li>Use complete sentences for better accuracy</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              {micError && (
                <div className="transcript-error">
                  ⚠️ {micError}
                </div>
              )}
              
              {!browserSupport && (
                <div className="browser-warning">
                  ⚠️ Speech recognition works best in Google Chrome
                </div>
              )}
            </div>
            
            <div className="submit-section">
              <button 
                className="submit-btn"
                onClick={handleAnswerSubmit}
                disabled={!transcript.trim() || isListening}
              >
                Submit Answer & Continue →
              </button>
              <div className="submit-hint">
                {!transcript 
                  ? `Speak your answer first, then submit (${answerTimer}s left)` 
                  : `Words: ${transcript.split(' ').length} • Ready to submit (${answerTimer}s left)`}
              </div>
            </div>
            
            {answerTimer <= 10 && answerTimer > 0 && isTimerRunning && (
              <div className="timer-warning">
                ⚠️ Hurry! Only {answerTimer} seconds remaining!
              </div>
            )}
            
            <div className="answer-tips">
              <h4>💡 Interview Mode:</h4>
              <ul>
                <li><strong>60-second timer</strong> starts when you click "Start Recording"</li>
                <li><strong>Timer pauses</strong> when you click "Pause"</li>
                <li><strong>Auto-submits</strong> when timer reaches 0</li>
                <li><strong>Manual submit</strong> available anytime before timer ends</li>
                <li><strong>Next question</strong> loads automatically after submission</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="controls-section">
          <div className="question-navigation">
            {questions.map((q, index) => (
              <button
                key={q.id}
                className={`question-nav-btn ${index === currentQuestionIndex ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    setIsTimerRunning(false);
                  }
                  setCurrentQuestionIndex(index);
                  setAnswerTimer(60);
                  setTranscript('');
                  setInterimTranscript('');
                  setDebugInfo('');
                  setRecordingTime(0);
                }}
                disabled={isListening}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="control-buttons">
            <button 
              className="prev-btn"
              onClick={() => {
                if (isListening) {
                  stopListening();
                  setIsTimerRunning(false);
                }
                setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
                setAnswerTimer(60);
                setTranscript('');
                setInterimTranscript('');
                setDebugInfo('');
                setRecordingTime(0);
              }}
              disabled={currentQuestionIndex === 0 || isListening}
            >
              ← Previous
            </button>
            
            <button 
              className="next-btn"
              onClick={() => {
                if (isListening) {
                  stopListening();
                  setIsTimerRunning(false);
                }
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                  setAnswerTimer(60);
                  setTranscript('');
                  setInterimTranscript('');
                  setDebugInfo('');
                  setRecordingTime(0);
                } else {
                  setShowResults(true);
                  localStorage.setItem(`interview_${categoryId}_results`, 'true');
                }
              }}
              disabled={isListening}
            >
              {currentQuestionIndex < questions.length - 1 ? 'Skip Question →' : 'Finish Interview'}
            </button>
          </div>
        </div>
      </main>
      
      <footer className="tech-info">
        <p>
          <strong>Using:</strong> Web Speech API • 
          <span className={`browser-status ${('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? 'supported' : 'unsupported'}`}>
            {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? '✅ Speech Recognition Active' : '❌ Not Supported'}
          </span>
          • <span className="save-status">💾 Auto-saving progress...</span>
        </p>
      </footer>
    </div>
  );
};

export default InterviewPage;