// server/models/Interview.js
const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Technical', 'Behavioral', 'HR', 'Scenario', 'Timer Test', 'Mock Interview', 'Quick Random', 'AI Generated'],
    required: true
  },
  subjects: [{
  type: String,
  enum: [
    'basic', 'Basic Interview',
    'os', 'Operating Systems',
    'cn', 'Computer Networks',
    'dbms', 'Database Systems',
    'dsa', 'Data Structures',
    'oop', 'OOP Design',
    'behavioral', 'Behavioral',
    'full', 'Full Interview',
    'resume', 'Resume Based'
  ]
}],
  // NEW: Store the actual questions from AI
  questions: [{
    id: {
      type: Number,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['technical', 'behavioral', 'scenario', 'hr'],
      default: 'technical'
    },
    category: {
      type: String,
      default: 'General'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    timeLimit: {
      type: Number,
      default: 60
    },
    expectedAnswer: {
      type: String,
      default: ''
    }
  }],
  // NEW: Store user answers
  answers: {
    type: Map,
    of: String, // questionId: answer
    default: {}
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  duration: {
    type: String,
    default: "00:00"
  },
  date: {
    type: Date,
    default: Date.now
  },
  feedback: {
    type: String,
    default: ""
  },
  // NEW: Track status
  status: {
    type: String,
    enum: ['generated', 'started', 'completed', 'evaluated'],
    default: 'generated'
  },
  // NEW: Store AI evaluation
  aiEvaluation: {
    overallScore: Number,
    breakdown: {
      technicalAccuracy: Number,
      communication: Number,
      problemSolving: Number,
      confidence: Number,
      completeness: Number
    },
    strengths: [String],
    improvements: [String],
    detailedFeedback: String,
    categoryScores: Map,
    suggestions: [String]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Interview', interviewSchema);