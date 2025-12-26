// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const emailService = require('./emailService'); // email service
const Interview = require('./models/Interview');
const User = require('./models/User');  // You need to create this file
const Session = require('./models/Session');  // You need to create this file
const app = express();

// Environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_interview_db';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PORT = process.env.PORT || 5000;

// =============== SECURITY MIDDLEWARE (BEFORE ROUTES) ===============
// Basic Express middleware
app.use(express.json()); // Parse JSON bodies

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));

// Custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Input sanitization - prevents NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_'
}));

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter); // Apply to all API routes

// Request logging (optional)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
// =============== END SECURITY MIDDLEWARE ===============

// MongoDB Connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// =============== SCHEMAS ===============
// Session Schema
/*const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now, expires: '7d' } // Auto-delete after 7 days
});

const Session = mongoose.model('Session', sessionSchema);

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, trim: true, sparse: true, default: null },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    googleId: { type: String, sparse: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    photo: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    interviewsCompleted: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);*/

// =============== HELPER FUNCTIONS ===============
// Password validation function
function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A-Z)';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter (a-z)';
    if (!/\d/.test(password)) return 'Password must contain at least one number (0-9)';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*)';
    return null; // valid
}

// =============== ROUTES START HERE ===============

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'AI Interview Coach Backend is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 20 || !/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
            return res.status(400).json({ success: false, error: 'Invalid username format (3-20 chars, letters/numbers/dot/underscore/hyphen)' });
        }

        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ success: false, error: passwordError });

        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: trimmedUsername }] });
        if (existingUser) {
            const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
            return res.status(409).json({ success: false, error: `${field} already registered` });
        }

        const newUser = new User({
            name: name.trim(),
            username: trimmedUsername,
            email: email.toLowerCase().trim(),
            password
        });

        await newUser.save();

        const token = jwt.sign({ userId: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

        // Create session for new user
        const session = new Session({
            userId: newUser._id,
            token: token,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        });
        await session.save();

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                photo: newUser.photo,
                provider: newUser.provider,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
    }
});

// Login (Email or Username)
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'Email/Username and password required' });

        let user;
        if (identifier.includes('@')) {
            user = await User.findOne({ email: identifier.toLowerCase() });
        } else {
            user = await User.findOne({ username: identifier });
        }

        if (!user) return res.status(401).json({ success: false, error: 'Invalid email/username or password' });

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) return res.status(401).json({ success: false, error: 'Invalid email/username or password' });

        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Create session for user
        const session = new Session({
            userId: user._id,
            token: token,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        });
        await session.save();

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                photo: user.photo,
                provider: user.provider,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                interviewsCompleted: user.interviewsCompleted,
                averageScore: user.averageScore
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ success: false, error: 'Server error. Please try again later.' });
    }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // For security, don't reveal if email exists
            return res.json({ 
                success: true, 
                message: 'If an account exists with this email, a reset link has been sent' 
            });
        }

        const resetToken = jwt.sign({ 
            userId: user._id, 
            type: 'password_reset' 
        }, JWT_SECRET, { expiresIn: '1h' });
        
        const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;

        console.log(`📧 Attempting to send password reset to: ${user.email}`);
        const emailResult = await emailService.sendPasswordReset(user.email, resetLink, user.name);

        if (!emailResult.success) {
            console.error('❌ Email sending failed:', emailResult.error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to send reset email. Please try again later.' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Password reset link sent to your email' 
        });
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again later.' 
        });
    }
});

// Verify Reset Token
app.post('/api/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, error: 'Reset token is required' });

        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ success: false, error: 'Invalid reset token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({ 
            success: true, 
            message: 'Token is valid', 
            email: user.email 
        });
    } catch (error) {
        console.error('❌ Verify token error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ 
                success: false, 
                error: 'Reset link expired. Please request a new one.' 
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid reset link' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again later.' 
        });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        if (!token || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Passwords do not match' 
            });
        }

        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ success: false, error: passwordError });

        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid reset token' 
            });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        user.password = password; // pre-save hook will hash
        await user.save();

        res.json({ 
            success: true, 
            message: 'Password reset successfully! You can now login with your new password.' 
        });
    } catch (error) {
        console.error('❌ Reset password error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ 
                success: false, 
                error: 'Reset link expired. Please request a new one.' 
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid reset link' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again later.' 
        });
    }
});

// Profile
app.get('/api/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token) return res.status(401).json({ 
            success: false, 
            error: 'Access denied. No token provided.' 
        });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('❌ Profile error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Google Login
app.post('/api/google-login', async (req, res) => {
    try {
        const { id, name, email, photo } = req.body;

        if (!email) return res.status(400).json({ 
            success: false, 
            error: 'Email is required' 
        });

        // Check if user exists by email OR googleId
        let user = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { googleId: id }
            ] 
        });

        if (!user) {
            user = await User.create({
                name: name.trim(),
                email: email.toLowerCase(),
                googleId: id,
                photo: photo,
                provider: 'google',
                createdAt: new Date()
            });
        } else {
            // Update existing user with Google info if needed
            if (!user.googleId) {
                user.googleId = id;
                user.provider = 'google';
                if (photo) user.photo = photo;
                await user.save();
            }
        }

        // Generate JWT token
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email 
        }, JWT_SECRET, { expiresIn: '7d' });

        // Create session for Google login
        const session = new Session({
            userId: user._id,
            token: token,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
        });
        await session.save();

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                photo: user.photo,
                provider: user.provider,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('❌ Google login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Refresh Token Endpoint
app.post('/api/refresh-token', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const oldToken = authHeader?.split(' ')[1];
        
        if (!oldToken) return res.status(401).json({ 
            success: false, 
            error: 'No token provided' 
        });

        const decoded = jwt.verify(oldToken, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });

        // Create new token
        const newToken = jwt.sign(
            { userId: user._id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // Update session with new token
        await Session.findOneAndUpdate(
            { token: oldToken },
            { token: newToken, createdAt: new Date() }
        );

        res.json({
            success: true,
            token: newToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error('❌ Refresh token error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired. Please login again.' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Logout
app.post('/api/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (token) {
            await Session.deleteOne({ token });
        }
        
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Deactivate account (soft delete)
app.post('/api/account/deactivate', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token) return res.status(401).json({ 
            success: false, 
            error: 'Access denied' 
        });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });

        user.isActive = false;
        user.deactivatedAt = new Date();
        await user.save();
        
        // Delete all sessions for this user
        await Session.deleteMany({ userId: user._id });

        res.json({ 
            success: true, 
            message: 'Account deactivated successfully' 
        });
    } catch (error) {
        console.error('❌ Deactivate account error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Delete account (hard delete)
app.delete('/api/account', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token) return res.status(401).json({ 
            success: false, 
            error: 'Access denied' 
        });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });

        // Delete user and all related data
        await User.deleteOne({ _id: user._id });
        await Session.deleteMany({ userId: user._id });
        
        res.json({ 
            success: true, 
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('❌ Delete account error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// Test Email Route (for development only)
app.get('/api/test-email', async (req, res) => {
    try {
        console.log('🧪 Testing email service...');
        const testResult = await emailService.sendPasswordReset(
            'test@example.com',
            `${CLIENT_URL}/reset-password?token=test123`,
            'Test User'
        );

        if (testResult.success) {
            res.json({ 
                success: true, 
                message: 'Test email sent successfully!', 
                previewUrl: testResult.previewUrl 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to send test email: ' + testResult.error 
            });
        }
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get user's interviews
    const interviews = await Interview.find({ userId })
      .sort({ date: -1 })
      .limit(20);

    // Calculate stats
    const totalInterviews = interviews.length;
    const totalScore = interviews.reduce((sum, interview) => sum + interview.score, 0);
    const avgScore = totalInterviews > 0 ? Math.round(totalScore / totalInterviews) : 0;
    const bestScore = Math.max(...interviews.map(i => i.score), 0);
    
    // Calculate improvement (last 3 vs previous 3 interviews)
    const recentAvg = interviews.slice(0, 3).reduce((sum, i) => sum + i.score, 0) / 3;
    const previousAvg = interviews.slice(3, 6).reduce((sum, i) => sum + i.score, 0) / 3;
    const improvement = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

    // Prepare data for frontend
    const response = {
      success: true,
      data: {
        user: {
          name: user.name,
          streak: user.streak || 7
        },
        stats: {
          totalInterviews,
          avgScore,
          bestScore,
          improvement: improvement > 0 ? `+${improvement}%` : `${improvement}%`
        },
        performanceData: [
          { name: 'W1', score: 65, color: '#667eea' },
          { name: 'W2', score: 72, color: '#4fd1c5' },
          { name: 'W3', score: 78, color: '#f6ad55' },
          { name: 'W4', score: 82, color: '#fc8181' },
          { name: 'W5', score: 85, color: '#9f7aea' },
          { name: 'W6', score: 82, color: '#667eea' }
        ],
        pieData: [
          { name: 'Technical', value: 35, color: '#667eea' },
          { name: 'Behavioral', value: 30, color: '#4fd1c5' },
          { name: 'HR', value: 20, color: '#f6ad55' },
          { name: 'Scenario', value: 15, color: '#fc8181' }
        ],
        categoryData: [
          { name: 'Technical', score: 75, questions: 25, color: '#667eea' },
          { name: 'Behavioral', score: 82, questions: 18, color: '#4fd1c5' },
          { name: 'HR', score: 88, questions: 15, color: '#f6ad55' }
        ],
        recentInterviews: interviews.slice(0, 3).map(interview => ({
          id: interview._id,
          type: interview.type,
          score: interview.score,
          date: formatDate(interview.date),
          duration: interview.duration
        })),
        tips: [
          { id: 1, title: 'Technical Skills', description: 'Focus on system design questions.', icon: '🎯', color: '#667eea' },
          { id: 2, title: 'Communication', description: 'Practice speaking clearly and concisely.', icon: '💬', color: '#4fd1c5' },
          { id: 3, title: 'Time Management', description: 'Work on answering within 2-3 minutes.', icon: '⏱️', color: '#f6ad55' },
          { id: 4, title: 'Consistency', description: 'Maintain your streak!', icon: '📈', color: '#fc8181' }
        ]
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Helper function to format date
function formatDate(date) {
  const now = new Date();
  const interviewDate = new Date(date);
  const diffDays = Math.floor((now - interviewDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return interviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============== INTERVIEW API ===============

// Save Interview Result
app.post('/api/interview/save', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { type, subjects, score, totalQuestions, correctAnswers, duration, feedback } = req.body;

    // Create new interview
    const interview = new Interview({
      userId,
      type: type || 'Technical',
      subjects: subjects || ['Technical'],
      score: score || 75,
      totalQuestions: totalQuestions || 10,
      correctAnswers: correctAnswers || 7,
      duration: duration || '12:45',
      feedback: feedback || 'Good performance!'
    });

    await interview.save();

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { interviewsCompleted: 1 },
      $set: { lastLogin: new Date() }
    });

    res.json({
      success: true,
      message: 'Interview saved successfully',
      interviewId: interview._id
    });
  } catch (error) {
    console.error('Save interview error:', error);
    res.status(500).json({ success: false, error: 'Failed to save interview' });
  }
});

// Get Interview History
app.get('/api/interview/history', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const interviews = await Interview.find({ userId })
      .sort({ date: -1 })
      .limit(50);

    res.json({
      success: true,
      interviews: interviews.map(interview => ({
        id: interview._id,
        type: interview.type,
        subjects: interview.subjects,
        score: interview.score,
        date: interview.date,
        duration: interview.duration,
        feedback: interview.feedback
      }))
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get interview history' });
  }
});

// Get Single Interview
app.get('/api/interview/:id', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const interview = await Interview.findOne({ _id: req.params.id, userId });
    
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    res.json({
      success: true,
      interview: {
        id: interview._id,
        type: interview.type,
        subjects: interview.subjects,
        score: interview.score,
        totalQuestions: interview.totalQuestions,
        correctAnswers: interview.correctAnswers,
        date: interview.date,
        duration: interview.duration,
        feedback: interview.feedback
      }
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ success: false, error: 'Failed to get interview' });
  }
});

// =============== ERROR HANDLING (AFTER ALL ROUTES) ===============
// 404 handler for unmatched routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API available at ${CLIENT_URL}`);
    console.log(`🔒 Security middleware enabled`);
    console.log(`📧 Email service: ${process.env.GMAIL_USER ? 'Configured' : 'Not configured'}`);
});