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
    enum: ['Technical', 'Behavioral', 'HR', 'Scenario', 'Timer Test', 'Mock Interview', 'Quick Random'],
    required: true
  },
  subjects: [{
    type: String,
    enum: [
      'Basic Interview',
      'Operating Systems',
      'Computer Networks',
      'Database Systems',
      'Data Structures',
      'OOP Design',
      'Behavioral',
      'Full Interview',
      'Resume Based'
    ]
  }],
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    default: 10
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  duration: {
    type: String, // Format: "12:45"
    default: "00:00"
  },
  date: {
    type: Date,
    default: Date.now
  },
  feedback: {
    type: String,
    default: "Good performance!"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Interview', interviewSchema);