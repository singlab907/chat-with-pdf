const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is missing');
  process.exit(1);
}

async function listModels() {
  try {
    const { data } = await axios.get(
      'https://generativelanguage.googleapis.com/v1/models',
      { params: { key: process.env.GEMINI_API_KEY } }
    );
    console.log('Available Gemini models:');
    data.models.forEach((model) => console.log(model.name));
  } catch (error) {
    console.error('Error listing models:', error.response?.data || error.message);
  }
}

listModels();
