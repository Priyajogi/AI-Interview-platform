// server.js - Complete with Email Routes
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
const User = require('./models/User');
const Session = require('./models/Session');
const Resume = require('./models/Resume'); // Resume model
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_interview_db';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PORT = process.env.PORT || 5000;

// =============== MIDDLEWARE ===============
app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));
app.use(mongoSanitize({ replaceWith: '_' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// =============== DATABASE CONNECTION ===============
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
});

// =============== HELPER FUNCTIONS ===============
function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return null;
}

// =============== AUTHENTICATION MIDDLEWARE ===============
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ success: false, error: 'Invalid token' });
        }
        res.status(500).json({ success: false, error: 'Authentication error' });
    }
};

// =============== ESSENTIAL ROUTES ===============

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'AI Interview Coach Backend',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        ai: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'
    });
});

// =============== AUTH ROUTES ===============
// Login
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ success: false, error: 'Email/Username and password required' });
        }

        let user;
        if (identifier.includes('@')) {
            user = await User.findOne({ email: identifier.toLowerCase() });
        } else {
            user = await User.findOne({ username: identifier });
        }

        if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Create session
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
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
            return res.status(400).json({ success: false, error: 'Username must be 3-20 characters' });
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

        // Create session
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
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Profile
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Logout
app.post('/api/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (token) {
            await Session.deleteOne({ token });
        }
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// =============== EMAIL ROUTES ===============
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

        console.log(`📧 Sending password reset to: ${user.email}`);
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
// Add to server.js
app.post('/api/debug-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    console.log('🔍 Debug Token:', {
      hasHeader: !!authHeader,
      header: authHeader,
      token: token ? `${token.substring(0, 20)}...` : 'No token',
      tokenLength: token?.length
    });
    
    if (!token) {
      return res.json({ error: 'No token provided' });
    }
    
    // Try to decode without verification first
    const jwt = require('jsonwebtoken');
    const decodedWithoutVerify = jwt.decode(token);
    
    console.log('📝 Decoded token (without verify):', decodedWithoutVerify);
    
    // Now try with verification
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
      res.json({
        valid: true,
        decoded: decoded,
        message: 'Token is valid'
      });
    } catch (verifyError) {
      res.json({
        valid: false,
        error: verifyError.message,
        decoded: decodedWithoutVerify
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Test Email Route
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


// Test route
app.get('/api/ai/test-public', async (req, res) => {
  try {
    console.log('\n🧪 Testing Hugging Face AI...');
    
    const HuggingFaceService = require('./ai/HuggingFaceService');
    const hf = new HuggingFaceService();
    
    const result = await hf.generateInterviewQuestions(
      ['os', 'cn'],
      'quick',
      'test-user-id'
    );
    
    res.json({
      success: true,
      result: result,
      message: 'Hugging Face AI test completed'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// Add this route BEFORE your protected /api/ai/generate route
app.post('/api/ai/generate-test', async (req, res) => {
  try {
    const { subjects, interviewType } = req.body;
    
    console.log('🧪 AI Generate Test (No Auth):', { subjects, interviewType });
    
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one subject'
      });
    }
    
    // Load Groq service
    const GroqQuestionService = require('./services/GroqQuestionService');
    const groqService = new GroqQuestionService();
    
    // Generate questions WITHOUT user ID
    const result = await groqService.generateQuestions(
      subjects, 
      interviewType || 'quick'
    );
    
    console.log('📊 Test Generation Result:', {
      success: result.success,
      questionsCount: result.questions?.length,
      isAI: result.isAI
    });
    
    // Create a mock interview ID for testing
    const mockInterviewId = 'test-' + Date.now();
    
    res.json({
      success: true,
      interviewId: mockInterviewId,
      questions: result.questions,
      isAI: result.isAI,
      source: result.source,
      message: `Test: Generated ${result.questions.length} questions`
    });
    
  } catch (error) {
    console.error('❌ Test generate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate interview questions',
      details: error.message
    });
  }
});
// Generate AI Interview (Main Route)
// Replace your existing /api/ai/generate route with:

app.post('/api/ai/generate', authMiddleware, async (req, res) => {
  try {
    const { subjects, interviewType } = req.body;
    const userId = req.user.userId;
    
    console.log('🎯 AI Generate Request:', { subjects, interviewType, userId });
    
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one subject'
      });
    }
    
    // Validate interview type
    const validTypes = ['quick', 'timed', 'mock'];
    const finalType = validTypes.includes(interviewType) ? interviewType : 'quick';
    
    // Load Groq service
    const GroqQuestionService = require('./services/GroqQuestionService');
    const groqService = new GroqQuestionService();
    
    // Check if it's resume-based
    let resumePath = null;
    if (subjects.includes('resume')) {
      // Find user's active resume
      const resume = await Resume.findOne({ 
        userId: userId, 
        isActive: true 
      });
      
      if (resume && fs.existsSync(resume.filePath)) {
        resumePath = resume.filePath;
        console.log(`📄 Using resume: ${resume.originalFilename}`);
      } else {
        console.log('⚠️ Resume selected but not found, using regular subjects');
      }
    }
    
    // Generate questions
    const result = await groqService.generateQuestions(
      subjects, 
      finalType, 
      userId, 
      resumePath
    );
    
    console.log('📊 Generation Result:', {
      success: result.success,
      isAI: result.isAI,
      questionsCount: result.questions?.length,
      source: result.source || 'subjects'
    });
    
    // Create interview record
    const interview = new Interview({
      userId: userId,
      type: result.source === 'resume' ? 'Resume Based AI' : 'AI Generated',
      subjects: subjects,
      questions: result.questions,
      totalQuestions: result.questions.length,
      status: 'generated',
      metadata: {
        isAI: result.isAI,
        source: result.source,
        model: result.model
      }
    });
    
    await interview.save();
    
    res.json({
      success: true,
      interviewId: interview._id,
      questions: result.questions,
      isAI: result.isAI,
      source: result.source,
      message: `Generated ${result.questions.length} ${result.source === 'resume' ? 'resume-based' : 'subject-based'} questions`
    });
    
  } catch (error) {
    console.error('❌ Generate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate interview questions',
      details: error.message
    });
  }
});
// Get AI Interview by ID
app.get('/api/ai/interview/:id', authMiddleware, async (req, res) => {
    try {
        const interview = await Interview.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });
        
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }
        
        res.json({
            success: true,
            interview: {
                id: interview._id,
                type: interview.type,
                subjects: interview.subjects,
                questions: interview.questions,
                totalQuestions: interview.totalQuestions,
                date: interview.date,
                status: interview.status
            }
        });
        
    } catch (error) {
        console.error('Get interview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interview'
        });
    }
});

// Save Interview Answers
app.post('/api/ai/interview/:id/answers', authMiddleware, async (req, res) => {
    try {
        const { answers, score, feedback } = req.body;
        const interviewId = req.params.id;
        const userId = req.user.userId;
        
        const interview = await Interview.findOne({
            _id: interviewId,
            userId: userId
        });
        
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }
        
        // Update interview with answers
        interview.answers = answers || {};
        if (score !== undefined) interview.score = score;
        if (feedback) interview.feedback = feedback;
        interview.status = 'completed';
        
        await interview.save();
        
        // Update user stats
        await User.findByIdAndUpdate(userId, {
            $inc: { interviewsCompleted: 1 }
        });
        
        res.json({
            success: true,
            message: 'Interview answers saved successfully'
        });
        
    } catch (error) {
        console.error('Save answers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save answers'
        });
    }
});

// Get User's AI Interviews
app.get('/api/ai/interviews', authMiddleware, async (req, res) => {
    try {
        const interviews = await Interview.find({
            userId: req.user.userId
        })
        .sort({ date: -1 })
        .limit(20);
        
        res.json({
            success: true,
            interviews: interviews.map(interview => ({
                id: interview._id,
                type: interview.type,
                subjects: interview.subjects,
                questionsCount: interview.questions.length,
                score: interview.score,
                date: interview.date,
                status: interview.status
            }))
        });
        
    } catch (error) {
        console.error('Get interviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interviews'
        });
    }
});

// =============== RESUME UPLOAD ROUTES ===============


// Configure storage for resume files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/resumes/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = req.user ? req.user.userId : 'guest';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `resume-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    }
};

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// File size formatting helper
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload Resume
app.post('/api/resume/upload', authMiddleware, upload.single('resume'), async (req, res) => {
    try {
        console.log('📁 Resume upload for user:', req.user.userId);
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded or invalid file type' 
            });
        }

        // Deactivate any existing active resume
        await Resume.updateMany(
            { userId: req.user.userId, isActive: true },
            { $set: { isActive: false } }
        );

        // Save new resume to database
        const resume = new Resume({
            userId: req.user.userId,
            originalFilename: req.file.originalname,
            storedFilename: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            fileType: path.extname(req.file.originalname).toLowerCase()
        });

        await resume.save();

        res.json({
            success: true,
            message: 'Resume uploaded successfully',
            resume: {
                id: resume._id,
                originalName: resume.originalFilename,
                fileSize: formatFileSize(resume.fileSize),
                fileType: resume.fileType,
                uploadDate: resume.uploadDate,
                downloadUrl: `/api/resume/download/${resume._id}`
            }
        });

    } catch (error) {
        console.error('❌ Resume upload error:', error);
        
        // Clean up uploaded file if error
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to clean up file:', unlinkError);
            }
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to upload resume' 
        });
    }
});

// Get current active resume
app.get('/api/resume/current', authMiddleware, async (req, res) => {
    try {
        const resume = await Resume.findOne({ 
            userId: req.user.userId, 
            isActive: true 
        });

        if (!resume) {
            return res.json({
                success: true,
                hasResume: false,
                message: 'No resume uploaded yet'
            });
        }

        res.json({
            success: true,
            hasResume: true,
            resume: {
                id: resume._id,
                originalName: resume.originalFilename,
                fileSize: formatFileSize(resume.fileSize),
                fileType: resume.fileType,
                uploadDate: resume.uploadDate,
                downloadUrl: `/api/resume/download/${resume._id}`
            }
        });
    } catch (error) {
        console.error('❌ Get resume error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get resume info' 
        });
    }
});

// Download resume
app.get('/api/resume/download/:id', authMiddleware, async (req, res) => {
    try {
        const resume = await Resume.findOne({ 
            _id: req.params.id, 
            userId: req.user.userId 
        });

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        if (!fs.existsSync(resume.filePath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume file not found on server' 
            });
        }

        res.download(resume.filePath, resume.originalFilename);
    } catch (error) {
        console.error('❌ Download resume error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to download resume' 
        });
    }
});

// =============== ERROR HANDLING ===============
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    
    // Handle multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `File upload error: ${err.message}`
        });
    }
    
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// =============== START SERVER ===============
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`📧 Email service: ${process.env.GMAIL_USER ? 'Configured' : 'Not configured'}`);
    console.log(`🤖 AI service: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
});