const User = require('../models/User');
const Interview = require('../models/Interview');

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.userid;
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get interviews data
    const interviews = await Interview.find({ userId })
      .sort({ date: -1 })
      .limit(10);

    // Calculate stats
    const totalInterviews = interviews.length;
    const totalScore = interviews.reduce((sum, interview) => sum + interview.score, 0);
    const avgScore = totalInterviews > 0 ? Math.round(totalScore / totalInterviews) : 0;
    const bestScore = Math.max(...interviews.map(i => i.score), 0);
    
    // Calculate improvement (compared to first half vs second half)
    const half = Math.floor(totalInterviews / 2);
    const firstHalfAvg = half > 0 ? 
      interviews.slice(0, half).reduce((sum, i) => sum + i.score, 0) / half : 0;
    const secondHalfAvg = totalInterviews - half > 0 ?
      interviews.slice(half).reduce((sum, i) => sum + i.score, 0) / (totalInterviews - half) : 0;
    const improvement = Math.round(secondHalfAvg - firstHalfAvg);

    // Group by type for pie chart
    const typeCounts = {};
    interviews.forEach(interview => {
      typeCounts[interview.type] = (typeCounts[interview.type] || 0) + 1;
    });

    // Generate pie data (all technical subjects under Technical category)
    const pieData = [];
    if (typeCounts.Technical) {
      pieData.push({ 
        name: 'Technical', 
        value: Math.round((typeCounts.Technical / totalInterviews) * 100),
        color: '#667eea'
      });
    }
    if (typeCounts.Behavioral) {
      pieData.push({ 
        name: 'Behavioral', 
        value: Math.round((typeCounts.Behavioral / totalInterviews) * 100),
        color: '#4fd1c5'
      });
    }
    if (typeCounts.HR) {
      pieData.push({ 
        name: 'HR', 
        value: Math.round((typeCounts.HR / totalInterviews) * 100),
        color: '#f6ad55'
      });
    }
    if (typeCounts.Scenario) {
      pieData.push({ 
        name: 'Scenario', 
        value: Math.round((typeCounts.Scenario / totalInterviews) * 100),
        color: '#fc8181'
      });
    }

    // Generate performance data (last 6 weeks)
    const performanceData = generatePerformanceData(interviews);

    // Generate category data (all technical subjects aggregated under Technical)
    const categoryData = [];
    
    // Calculate Technical category aggregate from all technical subjects
    const technicalInterviews = interviews.filter(i => i.type === 'Technical');
    if (technicalInterviews.length > 0) {
      const techScores = technicalInterviews.reduce((sum, i) => sum + i.score, 0);
      const techAvg = Math.round(techScores / technicalInterviews.length);
      const techQuestions = technicalInterviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
      
      categoryData.push({
        name: 'Technical',
        score: techAvg,
        questions: techQuestions,
        color: '#667eea'
      });
    }

    // Add other categories
    const behavioralInterviews = interviews.filter(i => i.type === 'Behavioral');
    if (behavioralInterviews.length > 0) {
      const behavioralScore = behavioralInterviews.reduce((sum, i) => sum + i.score, 0);
      const behavioralAvg = Math.round(behavioralScore / behavioralInterviews.length);
      const behavioralQuestions = behavioralInterviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
      
      categoryData.push({
        name: 'Behavioral',
        score: behavioralAvg,
        questions: behavioralQuestions,
        color: '#4fd1c5'
      });
    }

    const hrInterviews = interviews.filter(i => i.type === 'HR');
    if (hrInterviews.length > 0) {
      const hrScore = hrInterviews.reduce((sum, i) => sum + i.score, 0);
      const hrAvg = Math.round(hrScore / hrInterviews.length);
      const hrQuestions = hrInterviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
      
      categoryData.push({
        name: 'HR',
        score: hrAvg,
        questions: hrQuestions,
        color: '#f6ad55'
      });
    }

    // Recent interviews (format for frontend)
    const recentInterviews = interviews.slice(0, 3).map(interview => ({
      id: interview._id,
      type: interview.type,
      score: interview.score,
      date: formatDate(interview.date),
      duration: interview.duration
    }));

    // Tips based on performance
    const tips = generateTips(user, interviews, categoryData);

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          streak: user.streak
        },
        stats: {
          totalInterviews,
          avgScore,
          bestScore,
          improvement
        },
        performanceData,
        pieData,
        categoryData,
        recentInterviews,
        tips
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get technical dashboard data
// @route   GET /api/dashboard/technical
// @access  Private
const getTechnicalDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const interviews = await Interview.find({ userId, type: 'Technical' });

    // Calculate technical stats
    const totalQuestions = interviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
    const correctAnswers = interviews.reduce((sum, i) => sum + (i.correctAnswers || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    // Calculate average time per question
    const totalDuration = interviews.reduce((sum, i) => {
      const [hours, minutes, seconds] = i.duration.split(':').map(Number);
      return sum + (hours * 3600 + minutes * 60 + seconds);
    }, 0);
    
    const avgTimeSeconds = totalQuestions > 0 ? Math.round(totalDuration / totalQuestions) : 0;
    const avgTime = formatTime(avgTimeSeconds);

    // Calculate complexity distribution
    const complexity = { easy: 0, medium: 0, hard: 0 };
    interviews.forEach(interview => {
      if (interview.difficulty === 'Easy') complexity.easy++;
      else if (interview.difficulty === 'Medium') complexity.medium++;
      else if (interview.difficulty === 'Hard') complexity.hard++;
    });

    // Subject performance breakdown
    const subjectPerformance = calculateSubjectPerformance(interviews);

    // Weekly progress
    const weeklyProgress = calculateWeeklyProgress(interviews);

    // Skill matrix
    const skillMatrix = [
      { subject: 'Problem Solving', score: calculateSkillScore(interviews, 'DSA'), fullMark: 100 },
      { subject: 'System Design', score: calculateSkillScore(interviews, 'SystemDesign'), fullMark: 100 },
      { subject: 'Code Quality', score: calculateSkillScore(interviews, 'OOP'), fullMark: 100 },
      { subject: 'Database Design', score: calculateSkillScore(interviews, 'DBMS'), fullMark: 100 },
      { subject: 'OS Concepts', score: calculateSkillScore(interviews, 'OS'), fullMark: 100 },
      { subject: 'Networking', score: calculateSkillScore(interviews, 'Networks'), fullMark: 100 }
    ];

    // Recent technical interviews
    const recentTechInterviews = interviews.slice(0, 3).map(interview => ({
      id: interview._id,
      type: getInterviewType(interview),
      subjects: interview.technicalSubjects || ['Technical'],
      score: interview.score,
      date: formatDate(interview.date),
      duration: interview.duration,
      questions: interview.totalQuestions || 0,
      color: getSubjectColor(interview.technicalSubjects?.[0])
    }));

    // Technical tips
    const improvementTips = generateTechnicalTips(subjectPerformance);

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          streak: user.streak
        },
        techStats: {
          totalQuestions,
          accuracy,
          avgTime,
          complexity
        },
        subjectPerformance,
        weeklyProgress,
        skillMatrix,
        recentTechInterviews,
        improvementTips
      }
    });

  } catch (error) {
    console.error('Technical dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper functions
function generatePerformanceData(interviews) {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const colors = ['#667eea', '#4fd1c5', '#f6ad55', '#fc8181', '#9f7aea', '#667eea'];
  
  return weeks.map((week, index) => {
    // Simulate scores based on user performance trend
    const baseScore = 65 + (index * 3) + Math.random() * 5;
    return {
      name: week,
      score: Math.min(95, Math.round(baseScore)),
      color: colors[index]
    };
  });
}

function calculateSubjectPerformance(interviews) {
  const subjects = [
    { name: 'DSA', icon: '📊', color: '#4361ee' },
    { name: 'System Design', icon: '🏗️', color: '#06d6a0' },
    { name: 'OOP', icon: '🎨', color: '#9d4edd' },
    { name: 'DBMS', icon: '🗄️', color: '#ef476f' },
    { name: 'OS', icon: '💻', color: '#ff9e00' },
    { name: 'Networks', icon: '🌐', color: '#3a0ca3' }
  ];

  return subjects.map(subject => {
    const subjectInterviews = interviews.filter(i => 
      i.technicalSubjects && i.technicalSubjects.some(s => s.includes(subject.name))
    );
    
    if (subjectInterviews.length === 0) {
      return {
        ...subject,
        score: 0,
        accuracy: 0,
        speed: '0s'
      };
    }

    const totalScore = subjectInterviews.reduce((sum, i) => sum + i.score, 0);
    const avgScore = Math.round(totalScore / subjectInterviews.length);
    
    const totalQuestions = subjectInterviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
    const correctAnswers = subjectInterviews.reduce((sum, i) => sum + (i.correctAnswers || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    const totalDuration = subjectInterviews.reduce((sum, i) => {
      const [hours, minutes, seconds] = i.duration.split(':').map(Number);
      return sum + (hours * 3600 + minutes * 60 + seconds);
    }, 0);
    
    const avgTimeSeconds = totalQuestions > 0 ? Math.round(totalDuration / totalQuestions) : 0;
    const speed = formatTime(avgTimeSeconds);

    return {
      ...subject,
      score: avgScore,
      accuracy,
      speed
    };
  });
}

function calculateWeeklyProgress(interviews) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Start from Monday

  return days.map((day, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    
    const dayInterviews = interviews.filter(interview => {
      const interviewDate = new Date(interview.date);
      return interviewDate.toDateString() === dayDate.toDateString();
    });

    const questions = dayInterviews.reduce((sum, i) => sum + (i.totalQuestions || 0), 0);
    const correctAnswers = dayInterviews.reduce((sum, i) => sum + (i.correctAnswers || 0), 0);
    const accuracy = questions > 0 ? Math.round((correctAnswers / questions) * 100) : 0;

    return {
      day,
      questions,
      accuracy
    };
  });
}

function calculateSkillScore(interviews, skill) {
  const skillInterviews = interviews.filter(i => 
    i.categoryScores && i.categoryScores[skill]
  );
  
  if (skillInterviews.length === 0) return 0;
  
  const totalScore = skillInterviews.reduce((sum, i) => sum + i.categoryScores[skill], 0);
  return Math.round(totalScore / skillInterviews.length);
}

function generateTips(user, interviews, categoryData) {
  const tips = [];
  
  // Tip 1: ALWAYS show technical skills tip
  tips.push({
    id: 1,
    title: 'Technical Skills',
    description: 'Focus on improving your technical questions. Practice DSA and System Design.',
    icon: '🎯',
    color: '#667eea'
  });

  // Tip 2: ALWAYS show consistency tip
  tips.push({
    id: 2,
    title: 'Consistency',
    description: 'Try to practice daily to build a strong streak!',
    icon: '📈',
    color: '#4fd1c5'
  });

  // Tip 3: ALWAYS show time management tip
  tips.push({
    id: 3,
    title: 'Time Management',
    description: 'Work on answering questions within 2-3 minutes.',
    icon: '⏱️',
    color: '#f6ad55'
  });

  // Tip 4: ALWAYS show communication tip
  tips.push({
    id: 4,
    title: 'Communication',
    description: 'Practice explaining your thought process clearly.',
    icon: '💬',
    color: '#fc8181'
  });

  return tips;
}


function generateTechnicalTips(subjectPerformance) {
  const tips = [];
  
  // Sort by score to find weakest subject
  const sorted = [...subjectPerformance].sort((a, b) => a.score - b.score);
  
  sorted.slice(0, 2).forEach((subject, index) => {
    if (subject.score < 80) {
      tips.push({
        id: index + 1,
        title: getTechnicalTipTitle(subject.name),
        description: getTechnicalTipDescription(subject.name),
        icon: getSubjectIcon(subject.name),
        color: subject.color,
        subject: subject.name
      });
    }
  });

  // Add general tips if needed
  while (tips.length < 4) {
    const generalTips = [
      {
        title: 'Code Optimization',
        description: 'Always analyze time and space complexity.',
        icon: '⚡',
        color: '#4361ee',
        subject: 'General'
      },
      {
        title: 'Edge Cases',
        description: 'Test your solutions with edge cases.',
        icon: '🧪',
        color: '#06d6a0',
        subject: 'General'
      },
      {
        title: 'Whiteboard Practice',
        description: 'Practice writing code without autocomplete.',
        icon: '📝',
        color: '#9d4edd',
        subject: 'General'
      },
      {
        title: 'System Thinking',
        description: 'Think about scalability from the start.',
        icon: '🏗️',
        color: '#ef476f',
        subject: 'General'
      }
    ];
    tips.push({ ...generalTips[tips.length], id: tips.length + 1 });
  }

  return tips.slice(0, 4);
}

function getTechnicalTipTitle(subject) {
  const tips = {
    'DSA': 'Time Complexity',
    'System Design': 'System Scalability',
    'OOP': 'Design Patterns',
    'DBMS': 'Database Indexing',
    'OS': 'Concurrency',
    'Networks': 'Protocol Knowledge'
  };
  return tips[subject] || 'Practice More';
}

function getTechnicalTipDescription(subject) {
  const tips = {
    'DSA': 'Optimize your solutions to O(n log n) or better.',
    'System Design': 'Consider horizontal scaling in your designs.',
    'OOP': 'Apply SOLID principles consistently.',
    'DBMS': 'Use appropriate indexes for query optimization.',
    'OS': 'Practice deadlock prevention strategies.',
    'Networks': 'Understand HTTP/HTTPS and TCP/IP deeply.'
  };
  return tips[subject] || 'Focus on fundamentals.';
}

function getSubjectIcon(subject) {
  const icons = {
    'DSA': '📊',
    'System Design': '🏗️',
    'OOP': '🎨',
    'DBMS': '🗄️',
    'OS': '💻',
    'Networks': '🌐'
  };
  return icons[subject] || '🎯';
}

function getSubjectColor(subject) {
  const colors = {
    'DSA': '#4361ee',
    'System Design': '#06d6a0',
    'OOP': '#9d4edd',
    'DBMS': '#ef476f',
    'OS': '#ff9e00',
    'Networks': '#3a0ca3',
    'Behavioral': '#f72585',
    'HR': '#7209b7'
  };
  return colors[subject] || '#667eea';
}

function getInterviewType(interview) {
  if (interview.technicalSubjects && interview.technicalSubjects.length > 0) {
    if (interview.technicalSubjects.includes('System Design')) return 'System Design';
    if (interview.technicalSubjects.includes('DSA')) return 'Coding Test';
    return 'Technical Mock';
  }
  return 'Technical';
}

function formatDate(date) {
  const today = new Date();
  const interviewDate = new Date(date);
  const diffTime = Math.abs(today - interviewDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return interviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

module.exports = {
  getDashboardData,
  getTechnicalDashboard
};