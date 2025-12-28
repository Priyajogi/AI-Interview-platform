// server/services/GroqQuestionService.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

class GroqQuestionService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!this.apiKey || this.apiKey.includes('xxxx')) {
      console.warn('⚠️ GROQ_API_KEY not found or invalid');
    } else {
      console.log('✅ Groq Question Service Initialized');
    }
  }

  // MAIN METHOD: Generate questions (handles both regular and resume-based)
  async generateQuestions(subjects, interviewType, userId = null, resumePath = null) {
    console.log('🤖 Groq Question Generation:', { 
      subjects, 
      interviewType, 
      hasResume: !!resumePath 
    });
    
    // Validate API key
    if (!this.isValidAPIKey()) {
      console.log('🔄 Using fallback (no API key)');
      return this.getFallbackQuestions(subjects, interviewType, resumePath);
    }
    
    try {
      let questions;
      
      if (resumePath && fs.existsSync(resumePath)) {
        // RESUME-BASED QUESTIONS
        console.log('📄 Generating resume-based questions...');
        questions = await this.generateResumeBasedQuestions(resumePath, interviewType);
      } else {
        // REGULAR SUBJECT-BASED QUESTIONS
        console.log('📚 Generating subject-based questions...');
        questions = await this.generateSubjectBasedQuestions(subjects, interviewType);
      }
      
      // FORCE LIMIT to exact count (in case Groq ignores our request)
      const expectedCount = this.getQuestionCount(interviewType);
      if (questions.length > expectedCount) {
        console.log(`⚠️ Groq gave ${questions.length} questions, limiting to ${expectedCount}`);
        questions = questions.slice(0, expectedCount);
      }
      
      console.log(`✅ Generated ${questions.length} questions`);
      return {
        success: true,
        questions: questions,
        isAI: true,
        source: resumePath ? 'resume' : 'subjects',
        model: 'llama-3.1-8b-instant'
      };
      
    } catch (error) {
      console.error('❌ Groq generation error:', error.message);
      return this.getFallbackQuestions(subjects, interviewType, resumePath);
    }
  }

  // ===================== RESUME-BASED QUESTIONS =====================
  async generateResumeBasedQuestions(resumePath, interviewType) {
    // Step 1: Extract text from resume
    const resumeText = await this.extractResumeText(resumePath);
    
    if (!resumeText || resumeText.length < 100) {
      console.log('⚠️ Resume text too short, using fallback');
      return this.getResumeFallbackQuestions();
    }
    
    // Step 2: Prepare prompt for resume-based questions
    const prompt = this.buildResumePrompt(resumeText, interviewType);
    
    // Step 3: Call Groq API
    const response = await this.callGroqAPI(prompt, true);
    
    // Step 4: Parse response
    return this.parseQuestionResponse(response, true, this.getQuestionCount(interviewType));
  }

  async extractResumeText(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text || '';
      } 
      else if (ext === '.txt') {
        return fs.readFileSync(filePath, 'utf8');
      }
      else if (ext === '.doc' || ext === '.docx') {
        // Simple extraction for DOC files
        return fs.readFileSync(filePath, 'utf8').substring(0, 5000);
      }
      else {
        console.log(`⚠️ Unsupported file type: ${ext}, using simple text extraction`);
        return fs.readFileSync(filePath, 'utf8').substring(0, 3000);
      }
    } catch (error) {
      console.error('Resume extraction error:', error.message);
      return '';
    }
  }

  buildResumePrompt(resumeText, interviewType) {
    const questionCount = this.getQuestionCount(interviewType);
    
    // Truncate resume text for token limits
    const truncatedResume = resumeText.substring(0, 2000);
    
    return `Generate EXACTLY ${questionCount} personalized interview questions based on this resume:

RESUME CONTENT:
${truncatedResume}

CRITICAL: Generate ONLY ${questionCount} questions, no more, no less.

INSTRUCTIONS:
1. Read the resume and ask specific questions about:
   - Projects mentioned
   - Work experiences
   - Technical skills listed
   - Education and certifications
   - Achievements and responsibilities

2. Question types mix:
   - Technical questions about specific skills
   - Behavioral questions about experiences
   - Project-specific questions
   - Problem-solving scenarios

3. Format requirements (JSON only):
   [
     {
       "id": 1,
       "question": "Question text here",
       "type": "technical/behavioral/project/scenario",
       "category": "Resume-Based",
       "difficulty": "easy/medium/hard",
       "timeLimit": 45-120,
       "basedOn": "Briefly mention which part of resume this relates to"
     }
   ]

4. Make questions specific to the resume content. For example:
   - "I see you worked with [Technology]. Can you explain..."
   - "Your project [Project Name] sounds interesting. What was your role..."
   - "Tell me about your experience at [Company]..."

Generate EXACTLY ${questionCount} personalized questions:`;
  }

  // ===================== SUBJECT-BASED QUESTIONS =====================
  async generateSubjectBasedQuestions(subjects, interviewType) {
    const prompt = this.buildSubjectPrompt(subjects, interviewType);
    const response = await this.callGroqAPI(prompt, false);
    return this.parseQuestionResponse(response, false, this.getQuestionCount(interviewType));
  }

  buildSubjectPrompt(subjects, interviewType) {
    const questionCount = this.getQuestionCount(interviewType);
    
    const subjectNames = {
      'os': 'Operating Systems',
      'cn': 'Computer Networks',
      'dbms': 'Database Management Systems',
      'dsa': 'Data Structures and Algorithms',
      'oop': 'Object-Oriented Programming',
      'behavioral': 'Behavioral Interview',
      'basic': 'Basic Technical Interview',
      'full': 'Full Technical Interview',
      'resume': 'Resume-Based Interview'
    };

    const subjectText = subjects.map(s => subjectNames[s] || s).join(', ');
    
    return `Generate EXACTLY ${questionCount} interview questions for subjects: ${subjectText}.

CRITICAL: Generate ONLY ${questionCount} questions, no more, no less.

IMPORTANT: Return ONLY valid JSON array. Each question object MUST have:
- id (number, starting from 1)
- question (string)
- type (one of: "technical", "behavioral", "scenario", "hr")
- category (string, e.g., "Operating Systems", "Networks")
- difficulty (one of: "easy", "medium", "hard")
- timeLimit (number in seconds, between 30-120)

Example format for ${questionCount} questions:
[
  {
    "id": 1,
    "question": "Explain the difference between TCP and UDP.",
    "type": "technical",
    "category": "Computer Networks",
    "difficulty": "medium",
    "timeLimit": 60
  },
  {
    "id": 2,
    "question": "What is a deadlock and how can it be prevented?",
    "type": "technical",
    "category": "Operating Systems",
    "difficulty": "hard",
    "timeLimit": 75
  }
]

Make questions practical and interview-focused. Mix different difficulty levels.`;
  }

  // ===================== COMMON METHODS =====================
  getQuestionCount(interviewType) {
    // Quick Random: 5 questions, Timer Test: 10 questions, Mock Interview: 15 questions
    return {
      'quick': 5,      // Quick Random - 5 questions
      'timed': 10,     // Timer Test - 10 questions  
      'mock': 15       // Mock Interview - 15 questions
    }[interviewType] || 5;
  }

  async callGroqAPI(prompt, isResumeBased = false) {
    const model = 'llama-3.1-8b-instant';
    
    console.log(`📤 Calling Groq API (${isResumeBased ? 'Resume' : 'Subject'} mode)...`);
    
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer. Generate ONLY JSON output with exact number of questions requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: isResumeBased ? 0.7 : 0.8,
        max_tokens: isResumeBased ? 2500 : 1500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Groq API response received`);
    return data.choices[0].message.content;
  }

  // NEW: Validate and limit questions method
  validateAndLimitQuestions(questions, expectedCount) {
    if (!Array.isArray(questions)) {
      console.log('❌ Questions is not an array:', typeof questions);
      return this.getFallbackQuestions([], 'quick');
    }
    
    // Limit to expected count
    const limitedQuestions = questions.slice(0, expectedCount);
    
    // Ensure each question has required fields
    return limitedQuestions.map((q, index) => ({
      id: q.id || index + 1,
      question: q.question || q.text || `Question ${index + 1}`,
      type: q.type || (q.question?.toLowerCase().includes('behavior') ? 'behavioral' : 'technical'),
      category: q.category || 'General',
      difficulty: q.difficulty || (index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard'),
      timeLimit: q.timeLimit || (q.difficulty === 'easy' ? 45 : q.difficulty === 'medium' ? 60 : 75),
      basedOn: q.basedOn || ''
    }));
  }

  parseQuestionResponse(content, isResumeBased = false, expectedCount = 5) {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      
      let questionsArray = [];
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        questionsArray = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions;
      } else if (parsed.interviewQuestions) {
        questionsArray = parsed.interviewQuestions;
      } else {
        // Try to extract questions from object
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            questionsArray = parsed[key];
            break;
          }
        }
      }
      
      // If we found questions, validate and limit them
      if (questionsArray.length > 0) {
        return this.validateAndLimitQuestions(questionsArray, expectedCount);
      }
      
      // If no questions found, try text extraction
      const textQuestions = this.extractQuestionsFromText(content);
      return this.validateAndLimitQuestions(textQuestions, expectedCount);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      const textQuestions = this.extractQuestionsFromText(content);
      return this.validateAndLimitQuestions(textQuestions, expectedCount);
    }
  }

  extractQuestionsFromText(text) {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && line.includes('?'));
    
    return lines.slice(0, 15).map((line, index) => ({
      id: index + 1,
      question: line.replace(/^[Q0-9:.\-•*]+/, '').trim(),
      type: line.toLowerCase().includes('behavior') ? 'behavioral' : 'technical',
      category: 'General',
      difficulty: index < 3 ? 'easy' : index < 6 ? 'medium' : 'hard',
      timeLimit: 60,
      basedOn: line.toLowerCase().includes('resume') ? 'Resume content' : ''
    }));
  }

  // ===================== FALLBACK METHODS =====================
  isValidAPIKey() {
    return this.apiKey && 
           this.apiKey.startsWith('gsk_') && 
           !this.apiKey.includes('xxxx');
  }

  getFallbackQuestions(subjects, interviewType, resumePath = null) {
    if (resumePath) {
      return this.getResumeFallbackQuestions();
    } else {
      return this.getSubjectFallbackQuestions(subjects, interviewType);
    }
  }

  getResumeFallbackQuestions() {
    console.log('🔄 Using resume fallback questions');
    
    const fallbackQuestions = [
      {
        id: 1,
        question: "Can you walk me through one of the projects mentioned in your resume?",
        type: "project",
        category: "Resume-Based",
        difficulty: "medium",
        timeLimit: 90,
        basedOn: "Projects section of your resume"
      },
      {
        id: 2,
        question: "What technical skills from your resume are you most confident about?",
        type: "technical",
        category: "Resume-Based",
        difficulty: "easy",
        timeLimit: 60,
        basedOn: "Skills section of your resume"
      },
      {
        id: 3,
        question: "Describe a challenging problem you solved in one of your past roles.",
        type: "behavioral",
        category: "Resume-Based",
        difficulty: "medium",
        timeLimit: 90,
        basedOn: "Work experience in your resume"
      },
      {
        id: 4,
        question: "How did you apply your technical skills in your most recent project?",
        type: "technical",
        category: "Resume-Based",
        difficulty: "hard",
        timeLimit: 75,
        basedOn: "Recent project experience"
      },
      {
        id: 5,
        question: "What achievement from your resume are you most proud of and why?",
        type: "behavioral",
        category: "Resume-Based",
        difficulty: "medium",
        timeLimit: 60,
        basedOn: "Achievements section"
      }
    ];
    
    // Return limited number based on interview type
    const count = this.getQuestionCount('quick'); // Default to quick count
    return fallbackQuestions.slice(0, count);
  }

  getSubjectFallbackQuestions(subjects, interviewType) {
    console.log('🔄 Using subject fallback questions');
    
    const questionCount = this.getQuestionCount(interviewType);
    let questions = [];
    let id = 1;
    
    const subjectQuestions = {
      'os': [
        {
          question: "What is the difference between a process and a thread?",
          type: "technical",
          category: "Operating Systems",
          difficulty: "medium",
          timeLimit: 60
        },
        {
          question: "Explain deadlock and how to prevent it.",
          type: "technical",
          category: "Operating Systems",
          difficulty: "hard",
          timeLimit: 75
        },
        {
          question: "What are the different types of CPU scheduling algorithms?",
          type: "technical",
          category: "Operating Systems",
          difficulty: "medium",
          timeLimit: 60
        },
        {
          question: "Explain virtual memory and its benefits.",
          type: "technical",
          category: "Operating Systems",
          difficulty: "hard",
          timeLimit: 75
        },
        {
          question: "What is a semaphore and how is it used in synchronization?",
          type: "technical",
          category: "Operating Systems",
          difficulty: "medium",
          timeLimit: 60
        }
      ],
      'cn': [
        {
          question: "Explain the TCP/IP model layers and their functions.",
          type: "technical",
          category: "Computer Networks",
          difficulty: "medium",
          timeLimit: 60
        },
        {
          question: "What is the difference between TCP and UDP?",
          type: "technical",
          category: "Computer Networks",
          difficulty: "easy",
          timeLimit: 45
        },
        {
          question: "How does DNS work? Explain the resolution process.",
          type: "technical",
          category: "Computer Networks",
          difficulty: "medium",
          timeLimit: 60
        },
        {
          question: "What is HTTP/2 and how does it improve upon HTTP/1.1?",
          type: "technical",
          category: "Computer Networks",
          difficulty: "hard",
          timeLimit: 75
        },
        {
          question: "Explain the three-way handshake in TCP connection establishment.",
          type: "technical",
          category: "Computer Networks",
          difficulty: "medium",
          timeLimit: 60
        }
      ],
      'behavioral': [
        {
          question: "Tell me about yourself and your background.",
          type: "behavioral",
          category: "Behavioral",
          difficulty: "easy",
          timeLimit: 90
        },
        {
          question: "Describe a time you faced a significant challenge at work and how you overcame it.",
          type: "behavioral",
          category: "Behavioral",
          difficulty: "medium",
          timeLimit: 90
        },
        {
          question: "How do you handle conflicts within a team?",
          type: "behavioral",
          category: "Behavioral",
          difficulty: "medium",
          timeLimit: 60
        },
        {
          question: "Tell me about a time you failed and what you learned from it.",
          type: "behavioral",
          category: "Behavioral",
          difficulty: "hard",
          timeLimit: 75
        },
        {
          question: "Why do you want to work for a company like ours?",
          type: "behavioral",
          category: "Behavioral",
          difficulty: "easy",
          timeLimit: 60
        }
      ]
    };
    
    // Add questions from selected subjects
    subjects.forEach(subject => {
      if (subjectQuestions[subject]) {
        subjectQuestions[subject].forEach(q => {
          if (questions.length < questionCount) {
            questions.push({
              id: id++,
              ...q
            });
          }
        });
      }
    });
    
    // Fill remaining slots with generic questions
    while (questions.length < Math.min(questionCount, 15)) {
      questions.push({
        id: id++,
        question: "What interests you about this type of position and how do your skills align?",
        type: "behavioral",
        category: "General",
        difficulty: "easy",
        timeLimit: 60
      });
    }
    
    return questions.slice(0, questionCount);
  }
}

module.exports = GroqQuestionService;