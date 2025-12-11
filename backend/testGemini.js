const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

async function testGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is missing');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel(
      { model: modelName },
      { apiVersion: 'v1' }
    );
    const result = await model.generateContent('Say: Gemini backend is working!');
    console.log('✅ Gemini Response:', result.response.text());
  } catch (error) {
    console.error('❌ Error calling Gemini:', error);
  }
}

testGemini();
