// ~/ai-interview-project/client/src/components/Interview.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Interview.css';

function Interview() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch questions from backend
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/questions');
        setQuestions(response.data.questions);
      } catch (error) {
        console.error('Error fetching questions:', error);
        // Fallback questions
        setQuestions([
          { id: 1, text: "Tell me about yourself", category: "Introduction" },
          { id: 2, text: "What are your strengths?", category: "Personal" },
        ]);
      }
    };
    fetchQuestions();
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    // In real app, this would start microphone recording
  };

  const stopRecording = () => {
    setIsRecording(false);
    // In real app, this would stop recording and convert to text
  };

  const evaluateAnswer = async () => {
    if (!answer.trim()) {
      alert('Please type or record an answer first!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/evaluate', {
        question: questions[currentQuestion]?.text || '',
        answer: answer
      });
      
      setEvaluation(response.data.evaluation);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      alert('Failed to evaluate answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswer('');
      setEvaluation(null);
    } else {
      alert('🎉 Interview completed! Check your dashboard for results.');
    }
  };

  return (
    <div className="interview-page">
      <div className="interview-header">
        <h1>🎤 AI Interview Practice</h1>
        <p>Practice with real interview questions and get AI feedback</p>
      </div>

      {questions.length > 0 ? (
        <div className="interview-container">
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${((currentQuestion + 1) / questions.length) * 100}%` 
                }}
              ></div>
            </div>
            <p className="progress-text">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>

          {/* Question Card */}
          <div className="card question-card">
            <div className="question-header">
              <span className="question-number">Q{currentQuestion + 1}</span>
              <span className="question-category">
                {questions[currentQuestion]?.category}
              </span>
            </div>
            <h2 className="question-text">
              "{questions[currentQuestion]?.text}"
            </h2>
            <p className="question-tip">
              ⏱️ Suggested time: {questions[currentQuestion]?.timeLimit || 120} seconds
            </p>
          </div>

          {/* Answer Section */}
          <div className="card answer-section">
            <h3>Your Answer:</h3>
            
            <div className="recording-controls">
              <button 
                className={`record-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
              </button>
              <p className="recording-status">
                {isRecording ? 'Recording... Speak now!' : 'Click to record your voice answer'}
              </p>
            </div>

            <p className="or-text">- OR -</p>

            <textarea
              className="answer-textarea"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows="6"
            />

            <div className="action-buttons">
              <button 
                className="button-primary evaluate-button"
                onClick={evaluateAnswer}
                disabled={isLoading || !answer.trim()}
              >
                {isLoading ? '🧠 AI Evaluating...' : '🤖 Get AI Feedback'}
              </button>
              <button 
                className="button-secondary"
                onClick={nextQuestion}
              >
                {currentQuestion < questions.length - 1 ? 'Next Question →' : 'Finish Interview'}
              </button>
            </div>
          </div>

          {/* Evaluation Results */}
          {evaluation && (
            <div className="card evaluation-card">
              <h3>🤖 AI Evaluation</h3>
              
              <div className="overall-score">
                <div className="score-circle">
                  <span className="score-number">{evaluation.overall}</span>
                  <span className="score-label">/100</span>
                </div>
                <div className="score-grade">
                  <h4>Grade: {evaluation.grade}</h4>
                  <p>{evaluation.feedback}</p>
                </div>
              </div>

              <div className="detailed-scores">
                <h4>Detailed Breakdown:</h4>
                <div className="score-grid">
                  <div className="score-item">
                    <span className="score-category">Content</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ width: `${evaluation.scores.content}%` }}
                      ></div>
                    </div>
                    <span className="score-value">{evaluation.scores.content}/100</span>
                  </div>
                  <div className="score-item">
                    <span className="score-category">Confidence</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ width: `${evaluation.scores.confidence}%` }}
                      ></div>
                    </div>
                    <span className="score-value">{evaluation.scores.confidence}/100</span>
                  </div>
                  <div className="score-item">
                    <span className="score-category">Communication</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ width: `${evaluation.scores.communication}%` }}
                      ></div>
                    </div>
                    <span className="score-value">{evaluation.scores.communication}/100</span>
                  </div>
                  <div className="score-item">
                    <span className="score-category">Technical</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill"
                        style={{ width: `${evaluation.scores.technical}%` }}
                      ></div>
                    </div>
                    <span className="score-value">{evaluation.scores.technical}/100</span>
                  </div>
                </div>
              </div>

              <div className="suggestions">
                <h4>💡 Suggestions for Improvement:</h4>
                <ul>
                  {evaluation.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="loading">
          <p>Loading interview questions...</p>
        </div>
      )}
    </div>
  );
}

export default Interview;