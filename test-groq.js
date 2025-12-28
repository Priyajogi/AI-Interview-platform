// server/test-fixed-counts.js
require('dotenv').config();

async function testFixedQuestionCounts() {
  console.log('🧪 Testing Fixed Question Counts\n');
  
  const GroqQuestionService = require('./services/GroqQuestionService');
  const service = new GroqQuestionService();
  
  const tests = [
    { 
      type: 'quick', 
      expected: 5,
      name: 'Quick Random (5 questions)' 
    },
    { 
      type: 'timed', 
      expected: 10,
      name: 'Timer Test (10 questions)' 
    },
    { 
      type: 'mock', 
      expected: 15,
      name: 'Mock Interview (15 questions)' 
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📋 ${test.name}...`);
    
    const result = await service.generateQuestions(['os', 'cn'], test.type);
    
    console.log(`   Generated: ${result.questions.length} questions`);
    console.log(`   Expected: ${test.expected} questions`);
    
    if (result.questions.length === test.expected) {
      console.log('   ✅ PASS: Correct number of questions!');
    } else {
      console.log(`   ❌ FAIL: Expected ${test.expected}, got ${result.questions.length}`);
    }
    
    // Show sample questions
    if (result.questions.length > 0) {
      console.log(`\n   📝 Sample questions:`);
      result.questions.slice(0, 2).forEach((q, i) => {
        console.log(`   ${i + 1}. ${q.question.substring(0, 60)}...`);
        console.log(`      Type: ${q.type}, Difficulty: ${q.difficulty}, Time: ${q.timeLimit}s`);
      });
    }
  }
  
  // Test resume-based questions
  console.log('\n\n📋 Testing Resume-Based Questions...');
  const resumeResult = await service.generateQuestions(['resume'], 'quick');
  console.log(`   Generated: ${resumeResult.questions.length} resume questions`);
  console.log(`   Source: ${resumeResult.source}`);
  
  if (resumeResult.questions.length > 0) {
    console.log(`\n   📝 Resume questions:`);
    resumeResult.questions.slice(0, 2).forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.question.substring(0, 60)}...`);
    });
  }
}

testFixedQuestionCounts().catch(console.error);