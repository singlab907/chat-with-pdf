const { Router } = require('express');
const axios = require('axios');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { parseFile } = require('../utils/fileParser');

// Router responsible for serving backend API endpoints
const router = Router();

// Health check at /api/healthz
router.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-2.5-flash';

router.post('/files/parse', async (req, res) => {
  const { fileName, fileContent } = req.body || {};
  console.log('[files/parse] Incoming request', { fileName });

  if (!fileName || !fileContent) {
    return res.status(400).json({ message: 'fileName and fileContent are required' });
  }

  let tempDir;
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-with-pdf-'));
    const safeName = path.basename(fileName) || `upload-${Date.now()}`;
    const tempFilePath = path.join(tempDir, safeName);
    const buffer = Buffer.from(fileContent, 'base64');
    await fs.writeFile(tempFilePath, buffer);

    const extractedText = await parseFile(tempFilePath);

    return res.json({ fileText: extractedText });
  } catch (error) {
    console.error('[files/parse] Failed to parse file', { fileName, error: error.message });
    return res.status(500).json({ message: 'Failed to parse file' });
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
});

router.post('/chat', async (req, res) => {
  const { fileName, fileContent, prompt, conversationHistory = [] } = req.body || {};
  console.log('[chat] Incoming chat request', {
    fileName,
    promptPreview: prompt?.slice(0, 60),
    historyLength: conversationHistory.length,
  });

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  if (!fileContent) {
    return res.status(400).json({ message: 'You must upload and parse a document first' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: 'Gemini API key is not configured' });
  }

  const systemPrompt = buildPrompt(fileName, fileContent, conversationHistory, prompt);

  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
        ],
      }
    );

    const responseText =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        ?.join('\n')
        ?.trim() || 'No response generated.';

    const citations = extractCitations(data);

    return res.json({
      responseText,
      citations,
    });
  } catch (error) {
    console.error('[chat] Gemini API error', {
      fileName,
      promptPreview: prompt?.slice(0, 60),
      error: error.response?.data || error.message,
    });
    return res.status(502).json({
      message: 'Gemini API request failed',
      details: error.response?.data || error.message,
    });
  }
});

function buildPrompt(fileName, fileContent, history, prompt) {
  const historyText = history
    .map((entry) => `${entry.sender.toUpperCase()}: ${entry.text}`)
    .join('\n');

  return [
    'You are an assistant that answers questions based on an uploaded document.',
    `Document name: ${fileName || 'N/A'}`,
    'Document content:',
    fileContent,
    '',
    'Conversation so far:',
    historyText || 'No previous messages.',
    '',
    `User question: ${prompt}`,
  ].join('\n');
}

function extractCitations(apiResponse) {
  const citationMetadata =
    apiResponse?.candidates?.[0]?.citationMetadata?.citations || [];
  if (citationMetadata.length > 0) {
    return citationMetadata.map((entry) => entry.uri || entry.title || 'Citation');
  }

  const groundingChunks =
    apiResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  if (groundingChunks.length > 0) {
    return groundingChunks.map(
      (chunk) => chunk.web?.uri || chunk.web?.title || 'Referenced chunk'
    );
  }

  return [];
}

async function cleanupTempDir(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up temp directory', error);
  }
}

module.exports = router;
