// server/test-resume-questions.js
require('dotenv').config();

async function testResumeQuestions() {
  console.log('🧪 Testing Resume-Based Questions\n');
  
  // Test with a sample resume file
  const GroqQuestionService = require('./services/GroqQuestionService');
  const service = new GroqQuestionService();
  
  // Test 1: Resume-based questions
  console.log('1. Testing Resume-Based Questions...');
  const result = await service.generateQuestions(
    ['resume'],  // subjects includes 'resume'
    'quick',      // interview type
    'test-user-id',
    './test-resume.pdf'  // Path to a test resume file
  );
  
  console.log('\n📊 RESULTS:');
  console.log('Success:', result.success);
  console.log('Is AI:', result.isAI);
  console.log('Source:', result.source);
  console.log('Questions:', result.questions.length);
  
  if (result.questions.length > 0) {
    console.log('\n📝 SAMPLE QUESTIONS:');
    result.questions.slice(0, 2).forEach((q, i) => {
      console.log(`${i + 1}. ${q.question}`);
      console.log(`   Type: ${q.type}, Category: ${q.category}`);
      console.log(`   Based on: ${q.basedOn || 'N/A'}\n`);
    });
  }
  
  // Test 2: Regular subject questions
  console.log('\n2. Testing Regular Subject Questions...');
  const result2 = await service.generateQuestions(
    ['os', 'cn'],
    'quick'
  );
  
  console.log('\n📊 RESULTS 2:');
  console.log('Questions:', result2.questions.length);
}

testResumeQuestions().catch(console.error);